import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Goal, Transaction } from "./types";
import { supabase } from "./supabase";

// Chaves para persistência de dados no LocalStorage
const TX_KEY = "fintrack.v2.transactions";
const GOAL_KEY = "fintrack.v2.goals";

// 1. FUNCIONALIDADE: Dados extras do perfil coletados no cadastro
export interface ProfileData {
  name: string;
  username: string;
  cpf: string;       // Apenas dígitos (11 chars)
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
  user: { name: string; email: string } | null;
  isAuthed: boolean;
  // 2. FUNCIONALIDADE: Flag que indica se a sessão Supabase ainda está sendo verificada
  initializing: boolean;
  // 3. FUNCIONALIDADE: Estado de carregamento durante chamadas assíncronas ao Supabase
  loading: boolean;
  // 4. FUNCIONALIDADE: Mensagem de erro/sucesso retornada pelo Supabase
  authError: string | null;
  // 5. FUNCIONALIDADE: Login via CPF ou nome de usuário + senha real pelo Supabase
  login: (identifier: string, password: string) => Promise<void>;
  // 6. FUNCIONALIDADE: Cadastro com email, senha e dados de perfil no Supabase
  signUp: (email: string, password: string, profile: ProfileData) => Promise<void>;
  // 7. FUNCIONALIDADE: Logout via Supabase Auth
  logout: () => Promise<void>;
}

// Criação do contexto do React para compartilhamento global de estado
const Ctx = createContext<Store | null>(null);

/**
 * Utilitário para carregar dados do LocalStorage com fallback seguro.
 */
function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Provedor do Contexto da aplicação.
 * Gerencia transações, metas e autenticação real via Supabase.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [user, setUser] = useState<Store["user"]>(null);
  const [isAuthed, setAuthed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // 8. FUNCIONALIDADE: Controla se a verificação inicial de sessão do Supabase terminou
  const [initializing, setInitializing] = useState(true);

  // 9. FUNCIONALIDADE: Carrega transações e metas do LocalStorage na inicialização
  useEffect(() => {
    setTransactions(load<Transaction[]>(TX_KEY, []));
    setGoals(load<Goal[]>(GOAL_KEY, []));
    setHydrated(true);
  }, []);

  // 10. FUNCIONALIDADE: Busca o perfil completo do usuário na tabela profiles do Supabase
  async function fetchProfile(userId: string, fallbackEmail: string) {
    const { data } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", userId)
      .single();
    if (data) {
      setUser({ name: data.name, email: data.email });
    } else {
      // Fallback: deriva o nome pelo email caso o perfil ainda não exista
      const name = fallbackEmail.split("@")[0] ?? "Usuário";
      setUser({ name: name.charAt(0).toUpperCase() + name.slice(1), email: fallbackEmail });
    }
  }

  // 11. FUNCIONALIDADE: Ouve em tempo real as mudanças de sessão do Supabase Auth
  useEffect(() => {
    // Verifica a sessão ativa ao carregar o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email ?? "");
        setAuthed(true);
      }
      // Marca que a verificação inicial terminou — _app.tsx pode redirecionar agora
      setInitializing(false);
    });

    // Listener reativo: dispara no login, logout e expiração de token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email ?? "");
        setAuthed(true);
      } else {
        // Limpa o estado quando o usuário faz logout ou a sessão expira
        setUser(null);
        setAuthed(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Salva transações no LocalStorage toda vez que forem alteradas
  useEffect(() => {
    if (hydrated) localStorage.setItem(TX_KEY, JSON.stringify(transactions));
  }, [transactions, hydrated]);

  // Salva metas no LocalStorage toda vez que forem alteradas
  useEffect(() => {
    if (hydrated) localStorage.setItem(GOAL_KEY, JSON.stringify(goals));
  }, [goals, hydrated]);

  const value: Store = useMemo(
    () => ({
      transactions,
      goals,
      user,
      isAuthed,
      initializing,
      loading,
      authError,
      // Adiciona nova transação com UUID único
      addTx: (t) => setTransactions((arr) => [{ ...t, id: crypto.randomUUID() }, ...arr]),
      // Atualiza transação pelo id
      updateTx: (t) => setTransactions((arr) => arr.map((x) => (x.id === t.id ? t : x))),
      // Remove transação pelo id
      deleteTx: (id) => setTransactions((arr) => arr.filter((x) => x.id !== id)),
      // Adiciona nova meta com UUID único
      addGoal: (g) => setGoals((arr) => [...arr, { ...g, id: crypto.randomUUID() }]),

      // 12. FUNCIONALIDADE: Login via CPF, nome de usuário OU e-mail
      // Busca o e-mail associado no banco (por qualquer identificador) e autentica
      login: async (identifier, password) => {
        setLoading(true);
        setAuthError(null);

        // Busca o e-mail pelo CPF, username ou e-mail via função SQL security definer
        const { data: foundEmail, error: rpcError } = await supabase
          .rpc("get_email_by_identifier", { identifier: identifier.trim() });

        if (rpcError || !foundEmail) {
          setAuthError("CPF, nome de usuário ou e-mail não encontrado.");
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
      // Verifica CPF, username e e-mail ANTES de criar a conta, evitando usuário
      // órfão no Supabase Auth em caso de conflito no perfil.
      signUp: async (email, password, profile) => {
        setLoading(true);
        setAuthError(null);

        // 13a. PRÉ-CHECAGEM: verifica conflitos de CPF, username e email no banco
        // antes de chamar o Supabase Auth, para mostrar aviso claro ao usuário
        const { data: conflict, error: conflictError } = await supabase.rpc(
          "check_signup_conflicts",
          {
            check_email:    email.toLowerCase().trim(),
            check_username: profile.username,
            check_cpf:      profile.cpf,
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
        if (conflict === "cpf") {
          setAuthError("⚠️ Este CPF já está cadastrado.");
          setLoading(false);
          return;
        }

        // 13b. Cria a conta de autenticação no Supabase Auth
        const { data, error } = await supabase.auth.signUp({ email, password });

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
            user_cpf:        profile.cpf,
            user_birth_date: profile.birthDate,
          });

          if (profileError) {
            // Fallback: traduz erros de constraint único do Postgres
            if (profileError.message.includes("profiles_cpf_key")) {
              setAuthError("⚠️ Este CPF já está cadastrado.");
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
    }),
    [transactions, goals, user, isAuthed, initializing, loading, authError],
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
