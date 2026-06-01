import { createContext, useContext, useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import type { Goal, Transaction } from "./types";
import { supabase } from "./supabase";

// Função auxiliar para gerar UUIDs compatíveis em navegadores mobile que bloqueiam crypto.randomUUID (contexto HTTP)
function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 1. FUNCIONALIDADE: Dados extras do perfil coletados no cadastro
export interface ProfileData {
  name: string;
  username: string;
  phone: string;       // Apenas dígitos
  birthDate: string; // Formato ISO: YYYY-MM-DD
}

// Interface descrevendo o formato do estado global (Store)
interface Store {
  transactions: Transaction[];
  goals: Goal[];
  addTx: (t: Omit<Transaction, "id">) => void;
  updateTx: (t: Transaction) => void;
  deleteTx: (id: string) => void;
  addGoal: (g: Omit<Goal, "id">) => void;
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    phone: string;
    birth_date: string;
    avatar_key?: string;
    custom_avatar_base64?: string;
    monthly_limit: number;
    is_admin?: boolean;
    is_blocked?: boolean;
    last_seen?: string;
  } | null;
  isAuthed: boolean;
  theme: "dark" | "light";
  toggleTheme: () => void;
  // 2. FUNCIONALIDADE: Flag que indica se a sessão Supabase ainda está sendo verificada
  initializing: boolean;
  // 3. FUNCIONALIDADE: Estado de carregamento durante chamadas assíncronas ao Supabase
  loading: boolean;
  // 4. FUNCIONALIDADE: Mensagem de erro/sucesso retornada pelo Supabase
  authError: string | null;
  // 5. FUNCIONALIDADE: Login via Celular ou nome de usuário + senha real pelo Supabase
  login: (identifier: string, password: string) => Promise<void>;
  // 6. FUNCIONALIDADE: Cadastro com email, senha e dados de perfil no Supabase
  signUp: (email: string, password: string, profile: ProfileData) => Promise<void>;
  // 7. FUNCIONALIDADE: Logout via Supabase Auth
  logout: () => Promise<void>;
  // Login com Google
  loginWithGoogle: () => Promise<void>;
  // Recarrega o perfil do usuário ativo
  reloadProfile: () => Promise<void>;
  // Atualiza os dados do usuário no estado local imediatamente (otimista)
  updateUserLocal: (updates: Partial<Store["user"]>) => void;
  monthlyLimits: Record<string, number>;
  updateMonthlyLimit: (month: string, value: number) => Promise<void>;
}

// Criação do contexto do React para compartilhamento global de estado
const Ctx = createContext<Store | null>(null);

/**
 * Provedor do Contexto da aplicação.
 * Gerencia transações, metas e autenticação real via Supabase.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [user, setUser] = useState<Store["user"]>(null);
  const [monthlyLimits, setMonthlyLimits] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("fintrack.monthly_limits");
      return cached ? JSON.parse(cached) : {};
    }
    return {};
  });
  const [isAuthed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() => 
    (typeof window !== "undefined" && localStorage.getItem("appfin_theme") as "dark" | "light") || "dark"
  );
  // 8. FUNCIONALIDADE: Controla se a verificação inicial de sessão do Supabase terminou
  const [initializing, setInitializing] = useState(true);

  const activeFetches = useRef<Record<string, Promise<void>>>({});

  // Efeito para alternar classe do tema
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [theme]);

  // 10. FUNCIONALIDADE: Busca o perfil completo e os dados do usuário do banco (transações e metas)
  async function fetchProfile(authUser: any) {
    if (!authUser || !authUser.id) {
      console.warn("fetchProfile chamado com authUser inválido:", authUser);
      return;
    }
    const userId = authUser.id;
    const fallbackEmail = authUser.email ?? "";
    const userMetadata = authUser.user_metadata;

    if (activeFetches.current[userId] !== undefined) {
      return activeFetches.current[userId];
    }

    const promise = (async () => {
      // 1. Busca perfil do usuário
      const { data, error } = await supabase
          .from("profiles")
          .select("id, name, email, username, phone, birth_date, monthly_limit, avatar_key, custom_avatar_base64, is_admin, is_blocked, last_seen")
          .eq("id", userId)
          .single();
          
      if (data) {
        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          username: data.username,
          phone: data.phone,
          birth_date: data.birth_date,
          avatar_key: data.avatar_key || undefined,
          custom_avatar_base64: data.custom_avatar_base64 || undefined,
          monthly_limit: Number(data.monthly_limit ?? 0),
          is_admin: Boolean(data.is_admin),
          is_blocked: Boolean(data.is_blocked),
          last_seen: data.last_seen || undefined,
        });

        // Atualiza silenciosamente o last_seen para indicar que o usuário está ativo imediatamente
        const now = new Date();
        supabase.from("profiles").update({ last_seen: now.toISOString() }).eq("id", userId).then();

        // 2. Busca lançamentos (transactions) do banco
        const { data: txData } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });

        if (txData) {
          // Mapeia o snake_case do banco para o camelCase/interface do TypeScript
          const mappedTx: Transaction[] = txData.map(t => ({
            id: t.id,
            type: t.type,
            description: t.description,
            amount: Number(t.amount),
            date: t.date,
            categoryId: t.category_id
          }));
          setTransactions(mappedTx);
        }

        // 3. Busca metas (goals) do banco
        const { data: goalsData } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        if (goalsData) {
          const mappedGoals: Goal[] = goalsData.map(g => ({
            id: g.id,
            name: g.name,
            target: Number(g.target),
            current: Number(g.current)
          }));
          setGoals(mappedGoals);
        }

        // 4. Busca limites mensais (monthly_limits) do banco (com fallback seguro)
        try {
          const { data: limitsData } = await supabase
            .from("monthly_limits")
            .select("month, value")
            .eq("user_id", userId);
          if (limitsData) {
            const map: Record<string, number> = {};
            limitsData.forEach(item => {
              map[item.month] = Number(item.value);
            });
            setMonthlyLimits(map);
            localStorage.setItem("fintrack.monthly_limits", JSON.stringify(map));
          }
        } catch (e) {
          console.warn("Table monthly_limits might not exist yet, using localStorage fallback.");
        }

      } else {
        const isNotFoundError = error?.code === "PGRST116";

        if (isNotFoundError) {
          // Detecta se é um usuário recém-criado via Google (cadastro inicial)
          const providers = authUser.identities?.map((id: any) => id.provider) || [];
          const isGoogle = providers.includes("google");
          const isRecentlyCreated = (new Date().getTime() - new Date(authUser.created_at).getTime()) < 30000; // 30 segundos

          if (isGoogle && isRecentlyCreated) {
            // Cria o perfil se for o primeiro login do Google
            const googleName = userMetadata?.full_name || userMetadata?.name || fallbackEmail.split("@")[0] || "Usuário";
            const formattedName = googleName.charAt(0).toUpperCase() + googleName.slice(1);
            const usernameBase = (userMetadata?.email || fallbackEmail).split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
            const finalUsername = `${usernameBase}${Math.floor(1000 + Math.random() * 9000)}`;
            const tempPhone = `000000000${Math.floor(10 + Math.random() * 90)}`;

            const { error: insertError } = await supabase.rpc("create_user_profile", {
              user_id:         userId,
              user_email:      fallbackEmail,
              user_name:       formattedName,
              user_username:   finalUsername,
              user_phone:      tempPhone,
              user_birth_date: "2000-01-01"
            });

            if (!insertError) {
              setUser({
                id: userId,
                name: formattedName,
                email: fallbackEmail,
                username: finalUsername,
                phone: tempPhone,
                birth_date: "2000-01-01",
                avatar_key: userMetadata?.avatar_key || undefined,
                custom_avatar_base64: userMetadata?.custom_avatar_base64 || undefined,
                monthly_limit: 0
              });
            } else if (insertError.code === "23505" || insertError.message.includes("already exists")) {
              // Trata caso a inserção paralela tenha ocorrido primeiro
              const { data: retryData } = await supabase
                .from("profiles")
                .select("id, name, email, username, phone, birth_date, monthly_limit, avatar_key, custom_avatar_base64")
                .eq("id", userId)
                .single();
              if (retryData) {
                setUser({
                  id: retryData.id,
                  name: retryData.name,
                  email: retryData.email,
                  username: retryData.username,
                  phone: retryData.phone,
                  birth_date: retryData.birth_date,
                  avatar_key: retryData.avatar_key || undefined,
                  custom_avatar_base64: retryData.custom_avatar_base64 || undefined,
                  monthly_limit: Number(retryData.monthly_limit ?? 0)
                });
              }
            } else {
              console.error("Erro ao criar perfil Google:", insertError);
              // Fallback minimalista
              setUser({
                id: userId,
                name: formattedName,
                email: fallbackEmail,
                username: finalUsername,
                phone: tempPhone,
                birth_date: "2000-01-01",
                avatar_key: userMetadata?.avatar_key || undefined,
                custom_avatar_base64: userMetadata?.custom_avatar_base64 || undefined,
                monthly_limit: 0
              });
            }
          } else {
            // O perfil do usuário foi deletado no banco de dados. Desloga imediatamente.
            await supabase.auth.signOut();
            setUser(null);
            setTransactions([]);
            setGoals([]);
            setAuthed(false);
          }
        } else {
          console.error("Erro ao buscar perfil:", error);
        }
      }
      setLoading(false);
    })();

    activeFetches.current[userId] = promise;
    try {
      await promise;
    } finally {
      delete activeFetches.current[userId];
    }
  }

  // 11. FUNCIONALIDADE: Ouve em tempo real as mudanças de sessão do Supabase Auth
  useEffect(() => {
    // Verifica a sessão ativa ao carregar o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
        setAuthed(true);
      }
      // Marca que a verificação inicial terminou — _app.tsx pode redirecionar agora
      setInitializing(false);
    });

    // Listener reativo: dispara no login, logout e expiração de token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user);
        setAuthed(true);
      } else {
        // Limpa o estado quando o usuário faz logout ou a sessão expira
        setUser(null);
        setTransactions([]);
        setGoals([]);
        setAuthed(false);
      }
    });

    // Heartbeat: atualiza last_seen a cada 2 minutos para o admin detectar quem está online
    const heartbeat = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        supabase
          .from("profiles")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", session.user.id)
          .then();
      }
    }, 2 * 60 * 1000); // 2 minutos

    return () => {
      subscription.unsubscribe();
      clearInterval(heartbeat);
    };
  }, []);

  const value: Store = useMemo(
    () => ({
      transactions,
      goals,
      user,
      isAuthed,
      theme,
      toggleTheme: () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem("appfin_theme", next);
      },
      initializing,
      loading,
      authError,
      
      // Adiciona nova transação com UUID único (salva no estado e no banco assincronamente)
      addTx: (t) => {
        if (!user) return;
        const newId = safeUUID();
        const newTx = { ...t, id: newId };
        
        // Atualização otimista no UI
        setTransactions((arr) => [newTx, ...arr]);
        
        // Sincroniza com Supabase
        supabase.from('transactions').insert([{
          id: newId,
          user_id: user.id,
          type: newTx.type,
          description: newTx.description,
          amount: newTx.amount,
          date: newTx.date,
          category_id: newTx.categoryId
        }]).then(({ error }) => {
          if (error) {
            console.error("Erro ao salvar lançamento no banco:", error);
            alert("Erro ao salvar na nuvem: " + error.message + "\n\nVocê rodou o código SQL no painel do Supabase?");
          }
        });
      },
      
      // Atualiza transação pelo id (estado e banco)
      updateTx: (t) => {
        setTransactions((arr) => arr.map((x) => (x.id === t.id ? t : x)));
        
        supabase.from('transactions').update({
          type: t.type,
          description: t.description,
          amount: t.amount,
          date: t.date,
          category_id: t.categoryId
        }).eq('id', t.id).then(({ error }) => {
          if (error) console.error("Erro ao atualizar lançamento no banco:", error);
        });
      },
      
      // Remove transação pelo id (estado e banco)
      deleteTx: (id) => {
        setTransactions((arr) => arr.filter((x) => x.id !== id));
        
        supabase.from('transactions').delete().eq('id', id).then(({ error }) => {
          if (error) console.error("Erro ao excluir lançamento no banco:", error);
        });
      },
      
      // Adiciona nova meta com UUID único (estado e banco)
      addGoal: (g) => {
        if (!user) return;
        const newId = safeUUID();
        const newGoal = { ...g, id: newId };
        
        setGoals((arr) => [...arr, newGoal]);
        
        supabase.from('goals').insert([{
          id: newId,
          user_id: user.id,
          name: newGoal.name,
          target: newGoal.target,
          current: newGoal.current
        }]).then(({ error }) => {
          if (error) console.error("Erro ao salvar meta no banco:", error);
        });
      },

      // 12. FUNCIONALIDADE: Login via Celular, nome de usuário OU e-mail
      // Busca o e-mail associado no banco (por qualquer identificador) e autentica
      login: async (identifier, password) => {
        setLoading(true);
        setAuthError(null);

        // Busca o e-mail pelo celular, username ou e-mail via função SQL security definer
        const { data: foundEmail, error: rpcError } = await supabase
          .rpc("get_email_by_identifier", { identifier: identifier.trim() });

        if (rpcError || !foundEmail) {
          setAuthError("Celular, nome de usuário ou e-mail não encontrado.");
          setLoading(false);
          return;
        }

        // Autentica com o e-mail encontrado e a senha fornecida
        const { error } = await supabase.auth.signInWithPassword({
          email: foundEmail,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setAuthError("Senha incorreta.");
          } else if (error.message.includes("Email not confirmed")) {
            setAuthError("Confirme seu e-mail antes de entrar.");
          } else {
            setAuthError(error.message);
          }
        }
        setLoading(false);
      },

      // 13. FUNCIONALIDADE: Cadastro real com pré-validação de unicidade
      // Verifica Celular, username e e-mail ANTES de criar a conta, evitando usuário
      // órfão no Supabase Auth em caso de conflito no perfil.
      signUp: async (email, password, profile) => {
        setLoading(true);
        setAuthError(null);

        // 13a. PRÉ-CHECAGEM: verifica conflitos de celular, username e email no banco
        // antes de chamar o Supabase Auth, para mostrar aviso claro ao usuário
        const { data: conflict, error: conflictError } = await supabase.rpc(
          "check_signup_conflicts",
          {
            check_email:    email.toLowerCase().trim(),
            check_username: profile.username,
            check_phone:    profile.phone,
          }
        );

        if (conflictError) {
          setAuthError("Erro ao verificar dados. Tente novamente.");
          setLoading(false);
          return;
        }

        // Exibe aviso específico para cada tipo de conflito
        if (conflict === "email") {
          setAuthError("⚠️ Este e-mail já está cadastrado.");
          setLoading(false);
          return;
        }
        if (conflict === "username") {
          setAuthError("⚠️ Este nome de usuário já está em uso.");
          setLoading(false);
          return;
        }
        if (conflict === "phone") {
          setAuthError("⚠️ Este celular já está cadastrado.");
          setLoading(false);
          return;
        }

        // 13b. Cria a conta de autenticação no Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { has_password: true }
          }
        });

        if (error) {
          // Trata o erro de limite de e-mails do plano gratuito do Supabase
          if (error.message.toLowerCase().includes("rate limit") ||
              error.message.toLowerCase().includes("email rate limit")) {
            setAuthError("⚠️ Muitos cadastros em pouco tempo. Aguarde alguns minutos e tente novamente.");
          } else if (error.message.includes("already registered")) {
            setAuthError("⚠️ Este e-mail já está cadastrado.");
          } else {
            setAuthError(error.message);
          }
          setLoading(false);
          return;
        }

        if (data.user) {
          // 13c. Insere os dados do perfil via função SQL (security definer bypassa RLS)
          const { error: profileError } = await supabase.rpc("create_user_profile", {
            user_id:         data.user.id,
            user_email:      email,
            user_name:       profile.name,
            user_username:   profile.username,
            user_phone:      profile.phone,
            user_birth_date: profile.birthDate,
          });

          if (profileError) {
            // Fallback: traduz erros de constraint único do Postgres
            if (profileError.message.includes("profiles_phone_key") || profileError.message.includes("profiles_cpf_key")) {
              setAuthError("⚠️ Este celular já está cadastrado.");
            } else if (profileError.message.includes("profiles_username_key")) {
              setAuthError("⚠️ Este nome de usuário já está em uso.");
            } else {
              setAuthError("Erro ao salvar perfil: " + profileError.message);
            }
            setLoading(false);
            return;
          }

          // 13d. Verifica se a confirmação de e-mail está desativada no Supabase
          // (quando desativada, data.session já existe e o usuário é logado direto)
          if (data.session) {
            // Confirmação desativada: usuário já está autenticado, redireciona direto
            setAuthError("✅ Conta criada! Entrando...");
          } else {
            // Confirmação ativada: precisa verificar o e-mail antes de logar
            setAuthError("✅ Conta criada! Verifique seu e-mail para confirmar o cadastro.");
          }
        }

        setLoading(false);
      },

      // 14. FUNCIONALIDADE: Logout real via Supabase — encerra a sessão ativa
      logout: async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setLoading(false);
      },

      loginWithGoogle: async () => {
        setLoading(true);
        setAuthError(null);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) {
          setAuthError(error.message);
        }
        setLoading(false);
      },

      reloadProfile: async () => {
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        if (freshUser) {
          await fetchProfile(freshUser);
        }
      },

      updateUserLocal: (updates) => {
        setUser((prev) => prev ? { ...prev, ...updates } : null);
      },

      updateMonthlyLimit: async (month: string, value: number) => {
        if (!user) return;
        const updated = { ...monthlyLimits, [month]: value };
        setMonthlyLimits(updated);
        localStorage.setItem("fintrack.monthly_limits", JSON.stringify(updated));

        try {
          await supabase
            .from("monthly_limits")
            .upsert({ user_id: user.id, month, value }, { onConflict: "user_id,month" });
          
          // Se for o mês corrente, sincroniza também com o perfil (profiles.monthly_limit)
          const now = new Date();
          const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          if (month === currentMonthStr) {
            await supabase
              .from("profiles")
              .update({ monthly_limit: value })
              .eq("id", user.id);
            setUser((prev) => prev ? { ...prev, monthly_limit: value } : null);
          }
        } catch (e) {
          console.error("Failed to upsert monthly limit to Supabase:", e);
        }
      },

      monthlyLimits,
    }),
    [transactions, goals, user, isAuthed, theme, initializing, loading, authError, monthlyLimits],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Hook para acessar o estado da Store em qualquer componente.
 */
export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fora do provider");
  return s;
}

/**
 * Formata número para moeda Brasileira (BRL / R$).
 */
export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
