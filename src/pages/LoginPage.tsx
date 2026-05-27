import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, Loader2, Eye, EyeOff, CheckCircle2, XCircle, AtSign } from "lucide-react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

// ─── Utilitários ─────────────────────────────────────────────────────────────

// 1. FUNCIONALIDADE: Valida a senha conforme as regras exigidas
// Retorna array de regras não cumpridas (vazio = senha válida)
function validatePassword(pwd: string): string[] {
  const errors: string[] = [];
  if (pwd.length < 6)            errors.push("Mínimo 6 caracteres");
  if (!/[A-Z]/.test(pwd))        errors.push("1 letra maiúscula (A–Z)");
  if (!/[0-9]/.test(pwd))        errors.push("1 número (0–9)");
  if (!/[^A-Za-z0-9]/.test(pwd)) errors.push("1 caractere especial (!@#$...)");
  return errors;
}

// 2. FUNCIONALIDADE: Aplica máscara de CPF em tempo real: 000.000.000-00
function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// 3. FUNCIONALIDADE: Valida o formato do nome de usuário
// Regras: mínimo 6 chars, apenas a-z 0-9 _, não pode ser só números
function validateUsername(u: string): string | null {
  if (u.length === 0)              return null;
  if (u.length < 6)                return "Mínimo 6 caracteres";
  if (/^[0-9]+$/.test(u))          return "Não pode ser só números";
  if (!/^[a-z0-9_]+$/.test(u))    return "Apenas letras, números e _";
  return null;
}

// 4. FUNCIONALIDADE: Normaliza o nome para gerar sugestões de username
function normalizeName(n: string): string {
  return n
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

// 5. FUNCIONALIDADE: Gera sugestões de username com base no nome completo
function buildSuggestions(name: string): string[] {
  const norm  = normalizeName(name);
  const parts = norm.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];

  const first = parts[0];
  const last  = parts[parts.length - 1] ?? "";
  const rand2 = String(Math.floor(10 + Math.random() * 90));
  const rand3 = String(Math.floor(100 + Math.random() * 900));

  const candidates = [
    first + (last && last !== first ? "_" + last : ""),
    first + (last && last !== first ? last : ""),
    first + "_" + rand3,
    first + rand2,
    (first + last).slice(0, 12),
  ];

  return [
    ...new Set(
      candidates
        .map(s => s.replace(/[^a-z0-9_]/g, ""))
        .filter(s => s.length >= 6 && !/^[0-9]+$/.test(s))
        .map(s => s.slice(0, 20)),
    ),
  ].slice(0, 4);
}

// 5b. FUNCIONALIDADE: Capitaliza a primeira letra de cada palavra
function capitalizeName(val: string): string {
  return val
    .split(/(\s+)/)
    .map(part => {
      if (part.trim().length === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

// 5c. FUNCIONALIDADE: Valida matematicamente o CPF (algoritmo dos dígitos verificadores)
function validateCPF(cpfRaw: string): boolean {
  const cleanCpf = cpfRaw.replace(/\D/g, "");
  if (cleanCpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCpf.charAt(10))) return false;
  
  return true;
}

// 5d. FUNCIONALIDADE: Valida a estrutura padrão do e-mail (usuario@dominio.com.br, etc.)
function validateEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

// 5e. FUNCIONALIDADE: Valida se a idade é maior ou igual a 14 anos
function validateAge(birthDateStr: string): boolean {
  if (!birthDateStr) return false;
  const today = new Date();
  const birthDate = new Date(birthDateStr);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 14;
}

// ─── Componente ──────────────────────────────────────────────────────────────

/**
 * Componente LoginPage.
 */
export function LoginPage() {
  const { login, signUp, isAuthed, loading, authError } = useStore();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "signup" | "forgot_password">("login");

  // ─── Estados do Esqueci minha Senha (Quiz de Dados) ───
  const [forgotStep, setForgotStep] = useState(1); // 1, 2 ou 3
  const [forgotName, setForgotName] = useState("");
  const [forgotIdentifier, setForgotIdentifier] = useState(""); // usuario ou email
  const [forgotCpf, setForgotCpf] = useState("");
  const [forgotBirthDate, setForgotBirthDate] = useState("");
  const [forgotNewPwd, setForgotNewPwd] = useState("");
  const [forgotConfirmPwd, setForgotConfirmPwd] = useState("");
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotErrorMsg, setForgotErrorMsg] = useState("");
  const [showForgotSuccessModal, setShowForgotSuccessModal] = useState(false);

  const [identifier, setIdentifier]       = useState("");
  const [loginPwd,   setLoginPwd]         = useState("");
  const [showLoginPwd, setShowLoginPwd]   = useState(false);
  const [resetSent,  setResetSent]        = useState(false);

  const [name,          setName]          = useState("");
  const [username,      setUsername]      = useState("");
  const [cpf,           setCpf]           = useState("");
  const [birthDate,     setBirthDate]     = useState("");
  const [signupEmail,   setSignupEmail]   = useState("");
  const [signupPwd,     setSignupPwd]     = useState("");
  const [showSignupPwd, setShowSignupPwd] = useState(false);

  // 6. FUNCIONALIDADE: Estado de disponibilidade do username no banco
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  // 6b. FUNCIONALIDADE: Estado de disponibilidade do CPF e do e-mail no banco
  const [cpfStatus, setCpfStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  
  // 6c. FUNCIONALIDADE: Estado do modal customizado de confirmacao de cadastro
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 7. FUNCIONALIDADE: Sugestões de username
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  // 8. FUNCIONALIDADE: Valida formato do username
  const usernameFormatError = validateUsername(username);
  const isUsernameFormatOk  = username.length >= 6 && !usernameFormatError;
  const isUsernameReady     = isUsernameFormatOk && usernameStatus === "available";

  // 8b. FUNCIONALIDADE: Valida formatos do CPF e e-mail com os algoritmos oficiais
  const isCpfFormatOk = validateCPF(cpf);
  const isCpfReady    = isCpfFormatOk && cpfStatus === "available";

  const isEmailFormatOk = validateEmail(signupEmail);
  const isEmailReady    = isEmailFormatOk && emailStatus === "available";

  const isAgeOk = validateAge(birthDate);

  // 9. FUNCIONALIDADE: Calcula em tempo real quais regras de senha estão ok
  const pwdErrors  = validatePassword(signupPwd);
  const isPwdValid = pwdErrors.length === 0;

  // 10. FUNCIONALIDADE: Redireciona para o app quando o usuário autentica com sucesso
  useEffect(() => {
    if (isAuthed) navigate({ to: "/home", search: { tab: "home" } });
  }, [isAuthed, navigate]);

  // 11. FUNCIONALIDADE: Gera sugestões de username ao mudar o nome
  useEffect(() => {
    setUsernameSuggestions(buildSuggestions(name));
  }, [name]);

  // 12. FUNCIONALIDADE: Verifica disponibilidade do username com debounce
  useEffect(() => {
    if (!isUsernameFormatOk) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const { data: available } = await supabase
        .rpc("is_username_available", { uname: username });
      setUsernameStatus(available ? "available" : "taken");
    }, 600);
    return () => clearTimeout(timer);
  }, [username, isUsernameFormatOk]);

  // 12b. FUNCIONALIDADE: Verifica disponibilidade do CPF com debounce
  useEffect(() => {
    if (!isCpfFormatOk) {
      setCpfStatus("idle");
      return;
    }
    setCpfStatus("checking");
    const timer = setTimeout(async () => {
      const { data: available } = await supabase
        .rpc("is_cpf_available", { check_cpf: cpf });
      setCpfStatus(available ? "available" : "taken");
    }, 600);
    return () => clearTimeout(timer);
  }, [cpf, isCpfFormatOk]);

  // 12c. FUNCIONALIDADE: Verifica disponibilidade do E-mail com debounce
  useEffect(() => {
    if (!isEmailFormatOk) {
      setEmailStatus("idle");
      return;
    }
    setEmailStatus("checking");
    const timer = setTimeout(async () => {
      const { data: available } = await supabase
        .rpc("is_email_available", { check_email: signupEmail });
      setEmailStatus(available ? "available" : "taken");
    }, 600);
    return () => clearTimeout(timer);
  }, [signupEmail, isEmailFormatOk]);

  // 13. FUNCIONALIDADE: Limpa todos os campos ao alternar entre modos
  const switchMode = (m: "login" | "signup" | "forgot_password") => {
    setMode(m);
    setIdentifier(""); setLoginPwd(""); setShowLoginPwd(false); setResetSent(false);
    setName(""); setUsername(""); setCpf(""); setBirthDate("");
    setSignupEmail(""); setSignupPwd(""); setShowSignupPwd(false);
    setUsernameStatus("idle"); setCpfStatus("idle"); setEmailStatus("idle");
    // Limpa estados do esqueci minha senha
    setForgotStep(1); setForgotName(""); setForgotIdentifier("");
    setForgotCpf(""); setForgotBirthDate(""); setForgotNewPwd("");
    setForgotConfirmPwd(""); setForgotErrorMsg("");
  };

  // 14. FUNCIONALIDADE: Submete o formulário de login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !loginPwd) return;
    await login(identifier, loginPwd);
  };

  // 15. FUNCIONALIDADE: Submete o formulário de cadastro
  // Bloqueia se username não estiver válido e disponível
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPwdValid || !name || !username || !cpf || !birthDate || !signupEmail) return;
    if (!isUsernameReady || !isCpfReady || !isEmailReady || !isAgeOk) return; // Algum campo em conflito ou inválido

    // Abre o modal de confirmação customizado ao invés de usar o confirm nativo
    setShowConfirmModal(true);
  };

  const executeSignUp = async () => {
    setShowConfirmModal(false);
    await signUp(signupEmail, signupPwd, {
      name,
      username: username.toLowerCase(),
      cpf: cpf.replace(/\D/g, ""),   // Remove formatação antes de salvar
      birthDate,
    });
  };

  // 9. FUNCIONALIDADE: Recuperação de senha — valida CPF, nascimento, nome e identifier
  const handleVerifyForgotDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMsg("");
    setForgotLoading(true);
    try {
      const { data: verified, error } = await supabase.rpc("verify_reset_details", {
        check_cpf: forgotCpf,
        check_birth_date: forgotBirthDate,
        check_name: forgotName,
        check_identifier: forgotIdentifier,
      });
      if (error) throw error;
      if (verified) {
        setForgotStep(3);
      } else {
        setForgotErrorMsg("⚠️ Dados incorretos. Verifique as informações fornecidas.");
      }
    } catch (err: any) {
      setForgotErrorMsg("⚠️ Dados incorretos. Verifique as informações fornecidas.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMsg("");
    const newPwdErrors = validatePassword(forgotNewPwd);
    if (newPwdErrors.length > 0) {
      setForgotErrorMsg(`⚠️ Senha fraca: ${newPwdErrors.join(", ")}`);
      return;
    }
    if (forgotNewPwd !== forgotConfirmPwd) {
      setForgotErrorMsg("⚠️ As senhas não coincidem.");
      return;
    }
    setForgotLoading(true);
    try {
      const { data: success, error } = await supabase.rpc("reset_password_by_details", {
        check_cpf: forgotCpf,
        check_birth_date: forgotBirthDate,
        check_name: forgotName,
        check_identifier: forgotIdentifier,
        new_password: forgotNewPwd,
      });
      if (error) throw error;
      if (success) {
        setShowForgotSuccessModal(true);
      } else {
        setForgotErrorMsg("⚠️ Não foi possível alterar a senha. Verifique seus dados.");
      }
    } catch (err: any) {
      setForgotErrorMsg("⚠️ Não foi possível alterar a senha. Verifique seus dados.");
    } finally {
      setForgotLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 bg-navy">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center">

        {/* Logo */}
        <div className="h-16 w-16 rounded-2xl bg-orange flex items-center justify-center mb-4 shadow-lg shadow-orange/20">
          <Wallet size={30} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-cream tracking-tight">FinTrack</h1>
        <p className="mt-1.5 text-xs text-cream-muted text-center">
          Controle seu dinheiro com inteligência
        </p>

        {/* 10. FUNCIONALIDADE: Toggle entre modo Login e Cadastro */}
        <div className="grid grid-cols-2 w-full mt-6 p-1 rounded-full bg-navy-elevated border border-cream/10">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`py-2.5 rounded-full text-sm font-semibold transition-colors ${
                mode === m ? "bg-orange text-white" : "text-cream-muted hover:text-cream"
              }`}
            >
              {m === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        {/* ════════════ FORMULÁRIO DE LOGIN ════════════ */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="w-full mt-6 space-y-3.5">

            {/* Campo: CPF, nome de usuário ou e-mail */}
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="CPF, usuário ou e-mail"
              autoComplete="username"
              className="w-full px-4 py-3.5 rounded-xl bg-navy-elevated border border-cream/10 text-cream placeholder-cream-muted/50 outline-none focus:border-orange transition-colors text-sm"
            />

            {/* Campo: Senha com botão olhinho */}
            <div className="relative">
              <input
                type={showLoginPwd ? "text" : "password"}
                value={loginPwd}
                onChange={(e) => setLoginPwd(e.target.value)}
                placeholder="Senha"
                autoComplete="current-password"
                className="w-full px-4 py-3.5 pr-12 rounded-xl bg-navy-elevated border border-cream/10 text-cream placeholder-cream-muted/50 outline-none focus:border-orange transition-colors text-sm"
              />
              {/* 11. FUNCIONALIDADE: Olhinho para mostrar/ocultar a senha */}
              <button
                type="button"
                onClick={() => setShowLoginPwd((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream transition-colors"
                tabIndex={-1}
              >
                {showLoginPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Mensagem de erro/sucesso — cores diferenciadas por tipo */}
            {authError && (
              <p className={`text-xs text-center font-medium ${
                authError.startsWith("✅") ? "text-[#4CAF50]"
                : authError.startsWith("⚠️") ? "text-yellow-400"
                : "text-orange"
              }`}>{authError}</p>
            )}
            {resetSent && (
              <p className="text-xs text-center text-[#4CAF50] font-medium">
                ✅ Link de recuperação enviado para o seu e-mail
              </p>
            )}

            {/* Botão: Entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-orange text-white font-bold transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Aguarde..." : "Entrar"}
            </button>

            {/* 12. FUNCIONALIDADE: Recuperação de senha pelo CPF/username */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => switchMode("forgot_password")}
                className="text-xs text-cream-muted hover:text-cream transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>

          </form>
        )}

        {/* ════════════ FORMULÁRIO DE CADASTRO ════════════ */}
        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="w-full mt-6 space-y-3">

            {/* Campo: Nome completo */}
            <input
              value={name}
              onChange={(e) => setName(capitalizeName(e.target.value))}
              placeholder="Nome completo"
              autoComplete="name"
              className="w-full px-4 py-3.5 rounded-xl bg-navy-elevated border border-cream/10 text-cream placeholder-cream-muted/50 outline-none focus:border-orange transition-colors text-sm"
            />

            {/* Campo: Nome de usuário com validação, disponibilidade e sugestões */}
            <div className="space-y-1.5">

              {/* Input com ícone de status à direita */}
              <div className="relative">
                <AtSign size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-cream-muted/50" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="Nome de usuário (mín. 6 chars)"
                  autoComplete="username"
                  maxLength={20}
                  className={`w-full pl-9 pr-10 py-3.5 rounded-xl bg-navy-elevated border text-cream placeholder-cream-muted/50 outline-none transition-colors text-sm ${
                    usernameStatus === "available" ? "border-[#4CAF50]/60 focus:border-[#4CAF50]" :
                    usernameStatus === "taken"     ? "border-orange/60 focus:border-orange" :
                    "border-cream/10 focus:border-orange"
                  }`}
                />
                {/* 16. FUNCIONALIDADE: Ícone de status de disponibilidade do username */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking"  && <Loader2     size={15} className="text-cream-muted animate-spin" />}
                  {usernameStatus === "available" && <CheckCircle2 size={15} className="text-[#4CAF50]" />}
                  {usernameStatus === "taken"     && <XCircle      size={15} className="text-orange" />}
                </div>
              </div>

              {/* Mensagem de erro de formato */}
              {usernameFormatError && username.length > 0 && (
                <p className="text-[11px] text-orange pl-1">{usernameFormatError}</p>
              )}
              {/* Aviso de username já em uso */}
              {usernameStatus === "taken" && (
                <p className="text-[11px] text-orange pl-1">⚠️ Este nome de usuário já está em uso.</p>
              )}

              {/* 17. FUNCIONALIDADE: Sugestões clicaveis baseadas no nome digitado */}
              {usernameSuggestions.length > 0 && username.length === 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="text-[10px] text-cream-muted/60 w-full pl-1">Sugestões:</span>
                  {usernameSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setUsername(s)}
                      className="px-2.5 py-1 rounded-lg bg-navy-elevated border border-orange/20 text-orange text-[11px] font-medium hover:bg-orange/10 transition-colors"
                    >
                      @{s}
                    </button>
                  ))}
                </div>
              )}

            </div>

            {/* Campo: CPF com máscara automática e verificação em tempo real */}
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  value={cpf}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  placeholder="CPF (000.000.000-00)"
                  inputMode="numeric"
                  maxLength={14}
                  className={`w-full pr-10 pl-4 py-3.5 rounded-xl bg-navy-elevated border text-cream placeholder-cream-muted/50 outline-none transition-colors text-sm ${
                    cpfStatus === "available" ? "border-[#4CAF50]/60 focus:border-[#4CAF50]" :
                    cpfStatus === "taken" || (cpf.replace(/\D/g, "").length === 11 && !isCpfFormatOk) ? "border-orange/60 focus:border-orange" :
                    "border-cream/10 focus:border-orange"
                  }`}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {cpfStatus === "checking"  && <Loader2     size={15} className="text-cream-muted animate-spin" />}
                  {cpfStatus === "available" && <CheckCircle2 size={15} className="text-[#4CAF50]" />}
                  {(cpfStatus === "taken" || (cpf.replace(/\D/g, "").length === 11 && !isCpfFormatOk)) && <XCircle size={15} className="text-orange" />}
                </div>
              </div>
              {cpf.replace(/\D/g, "").length === 11 && !isCpfFormatOk && (
                <p className="text-[11px] text-orange pl-1">⚠️ CPF inválido.</p>
              )}
              {cpfStatus === "taken" && (
                <p className="text-[11px] text-orange pl-1">⚠️ Este CPF já está cadastrado.</p>
              )}
            </div>

            {/* Campo: Data de nascimento (Validação mínimo 14 anos) */}
            <div className="space-y-1.5">
              <label className="block text-[11px] text-cream-muted/70 mb-1.5 pl-1">
                Data de nascimento (mín. 14 anos)
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={`w-full px-4 py-3.5 rounded-xl bg-navy-elevated border text-cream outline-none transition-colors text-sm ${
                  birthDate && isAgeOk  ? "border-[#4CAF50]/60 focus:border-[#4CAF50]" :
                  birthDate && !isAgeOk ? "border-orange/60 focus:border-orange" :
                  "border-cream/10 focus:border-orange"
                }`}
              />
              {birthDate && !isAgeOk && (
                <p className="text-[11px] text-orange pl-1">⚠️ Menores de 14 anos não podem se cadastrar.</p>
              )}
            </div>

            {/* Campo: E-mail com verificação em tempo real */}
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="E-mail"
                  autoComplete="email"
                  className={`w-full pr-10 pl-4 py-3.5 rounded-xl bg-navy-elevated border text-cream placeholder-cream-muted/50 outline-none transition-colors text-sm ${
                    emailStatus === "available" ? "border-[#4CAF50]/60 focus:border-[#4CAF50]" :
                    emailStatus === "taken" || (signupEmail.length > 0 && !isEmailFormatOk) ? "border-orange/60 focus:border-orange" :
                    "border-cream/10 focus:border-orange"
                  }`}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {emailStatus === "checking"  && <Loader2     size={15} className="text-cream-muted animate-spin" />}
                  {emailStatus === "available" && <CheckCircle2 size={15} className="text-[#4CAF50]" />}
                  {(emailStatus === "taken" || (signupEmail.length > 0 && !isEmailFormatOk)) && <XCircle size={15} className="text-orange" />}
                </div>
              </div>
              {signupEmail.length > 0 && !isEmailFormatOk && (
                <p className="text-[11px] text-orange pl-1">⚠️ E-mail inválido.</p>
              )}
              {emailStatus === "taken" && (
                <p className="text-[11px] text-orange pl-1">⚠️ Este e-mail já está cadastrado.</p>
              )}
            </div>

            {/* Campo: Senha com botão olhinho */}
            <div className="relative">
              <input
                type={showSignupPwd ? "text" : "password"}
                value={signupPwd}
                onChange={(e) => setSignupPwd(e.target.value)}
                placeholder="Senha"
                autoComplete="new-password"
                className="w-full px-4 py-3.5 pr-12 rounded-xl bg-navy-elevated border border-cream/10 text-cream placeholder-cream-muted/50 outline-none focus:border-orange transition-colors text-sm"
              />
              {/* 13. FUNCIONALIDADE: Olhinho para mostrar/ocultar a senha no cadastro */}
              <button
                type="button"
                onClick={() => setShowSignupPwd((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream transition-colors"
                tabIndex={-1}
              >
                {showSignupPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* 14. FUNCIONALIDADE: Indicador visual das regras de senha em tempo real */}
            {signupPwd && (
              <div className="rounded-xl bg-navy-elevated/60 p-3 space-y-1.5 border border-cream/5">
                {[
                  "Mínimo 6 caracteres",
                  "1 letra maiúscula (A–Z)",
                  "1 número (0–9)",
                  "1 caractere especial (!@#$...)",
                ].map((rule) => {
                  const passed = !pwdErrors.includes(rule);
                  return (
                    <div key={rule} className="flex items-center gap-2">
                      {passed
                        ? <CheckCircle2 size={13} className="text-[#4CAF50] shrink-0" />
                        : <XCircle     size={13} className="text-orange/60 shrink-0" />
                      }
                      <span className={`text-[11px] ${passed ? "text-[#4CAF50]" : "text-cream-muted"}`}>
                        {rule}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mensagem de erro/sucesso do Supabase — cores diferenciadas por tipo */}
            {authError && (
              <p className={`text-xs text-center font-medium ${
                authError.startsWith("✅") ? "text-[#4CAF50]"
                : authError.startsWith("⚠️") ? "text-yellow-400"
                : "text-orange"
              }`}>
                {authError}
              </p>
            )}

            {/* 18. FUNCIONALIDADE: Botão bloqueado até senha válida E username/cpf/email disponíveis e maioridade (14) */}
            <button
              type="submit"
              disabled={loading || !isPwdValid || !name || !isUsernameReady || !isCpfReady || !isEmailReady || !isAgeOk}
              className="w-full py-3.5 rounded-xl bg-orange text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Criando conta..." : "Criar conta"}
            </button>

          </form>
        )}

        {/* ════════════ FORMULÁRIO DE ESQUECI MINHA SENHA (QUIZ) ════════════ */}
        {mode === "forgot_password" && (
          <div className="w-full mt-6 space-y-4">
            
            {/* Título e Progresso */}
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-cream">Recuperar Senha</h2>
              <p className="text-xs text-cream-muted">
                Etapa {forgotStep} de 3
              </p>
              {/* Barra de Progresso */}
              <div className="w-full h-1.5 bg-navy-elevated rounded-full overflow-hidden border border-cream/5">
                <div
                  className="h-full bg-orange transition-all duration-300"
                  style={{ width: `${(forgotStep / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* ETAPA 1: Nome Completo e Identificador (Usuário ou E-mail) */}
            {forgotStep === 1 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (forgotName.trim() && forgotIdentifier.trim()) {
                    setForgotStep(2);
                  }
                }}
                className="space-y-3.5"
              >
                <div className="space-y-1">
                  <label className="block text-[11px] text-cream-muted/70 pl-1">
                    Nome Completo
                  </label>
                  <input
                    value={forgotName}
                    onChange={(e) => setForgotName(capitalizeName(e.target.value))}
                    placeholder="Nome completo cadastrado"
                    required
                    className="w-full px-4 py-3.5 rounded-xl bg-navy-elevated border border-cream/10 text-cream placeholder-cream-muted/50 outline-none focus:border-orange transition-colors text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-cream-muted/70 pl-1">
                    Nome de usuário ou E-mail
                  </label>
                  <input
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value.trim())}
                    placeholder="Usuário ou e-mail"
                    required
                    className="w-full px-4 py-3.5 rounded-xl bg-navy-elevated border border-cream/10 text-cream placeholder-cream-muted/50 outline-none focus:border-orange transition-colors text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!forgotName.trim() || !forgotIdentifier.trim()}
                  className="w-full py-3.5 rounded-xl bg-orange text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                >
                  Próxima Etapa
                </button>
              </form>
            )}

            {/* ETAPA 2: CPF e Data de Nascimento */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyForgotDetails} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[11px] text-cream-muted/70 pl-1">
                    CPF
                  </label>
                  <input
                    value={forgotCpf}
                    onChange={(e) => setForgotCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={14}
                    required
                    className="w-full px-4 py-3.5 rounded-xl bg-navy-elevated border border-cream/10 text-cream placeholder-cream-muted/50 outline-none focus:border-orange transition-colors text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-cream-muted/70 pl-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={forgotBirthDate}
                    onChange={(e) => setForgotBirthDate(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 rounded-xl bg-navy-elevated border border-cream/10 text-cream outline-none focus:border-orange transition-colors text-sm"
                  />
                </div>

                {forgotErrorMsg && (
                  <p className="text-xs text-center text-orange font-medium">
                    {forgotErrorMsg}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="py-3.5 rounded-xl border border-cream/10 text-cream-muted text-xs font-semibold hover:text-cream transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotCpf || !forgotBirthDate}
                    className="py-3.5 rounded-xl bg-orange text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
                  >
                    {forgotLoading && <Loader2 size={14} className="animate-spin" />}
                    Validar Dados
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 3: Nova Senha e Confirmação */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[11px] text-cream-muted/70 pl-1">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotPwd ? "text" : "password"}
                      value={forgotNewPwd}
                      onChange={(e) => setForgotNewPwd(e.target.value)}
                      placeholder="Senha com regras"
                      required
                      className="w-full px-4 py-3.5 pr-12 rounded-xl bg-navy-elevated border border-cream/10 text-cream placeholder-cream-muted/50 outline-none focus:border-orange transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPwd((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream transition-colors"
                      tabIndex={-1}
                    >
                      {showForgotPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-cream-muted/70 pl-1">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotPwd ? "text" : "password"}
                      value={forgotConfirmPwd}
                      onChange={(e) => setForgotConfirmPwd(e.target.value)}
                      placeholder="Repita a nova senha"
                      required
                      className="w-full px-4 py-3.5 pr-12 rounded-xl bg-navy-elevated border border-cream/10 text-cream placeholder-cream-muted/50 outline-none focus:border-orange transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPwd((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream transition-colors"
                      tabIndex={-1}
                    >
                      {showForgotPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {forgotNewPwd && (
                  <div className="rounded-xl bg-navy-elevated/60 p-3 space-y-1.5 border border-cream/5">
                    {[
                      "Mínimo 6 caracteres",
                      "1 letra maiúscula (A–Z)",
                      "1 número (0–9)",
                      "1 caractere especial (!@#$...)",
                    ].map((rule) => {
                      const passed = !validatePassword(forgotNewPwd).includes(rule);
                      return (
                        <div key={rule} className="flex items-center gap-2">
                          {passed
                            ? <CheckCircle2 size={13} className="text-[#4CAF50] shrink-0" />
                            : <XCircle     size={13} className="text-orange/60 shrink-0" />
                          }
                          <span className={`text-[11px] ${passed ? "text-[#4CAF50]" : "text-cream-muted"}`}>
                            {rule}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {forgotErrorMsg && (
                  <p className="text-xs text-center text-orange font-medium">
                    {forgotErrorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading || !forgotNewPwd || forgotNewPwd !== forgotConfirmPwd || validatePassword(forgotNewPwd).length > 0}
                  className="w-full py-3.5 rounded-xl bg-orange text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center gap-1.5"
                >
                  {forgotLoading && <Loader2 size={18} className="animate-spin" />}
                  Alterar Senha
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-xs text-cream-muted hover:text-cream transition-colors"
              >
                Voltar para o Login
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Modal Customizado de Sucesso na Recuperação de Senha */}
      {showForgotSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-navy-elevated border border-cream/10 rounded-3xl p-6 w-full max-w-xs text-center space-y-5 shadow-2xl animate-scale-up">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#4CAF50]/10 flex items-center justify-center text-[#4CAF50]">
              <CheckCircle2 size={24} />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-cream">Senha alterada!</h3>
              <p className="text-xs text-cream-muted leading-relaxed">
                Sua senha foi alterada com sucesso. Agora você já pode entrar no app.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowForgotSuccessModal(false);
                switchMode("login");
              }}
              className="w-full py-3.5 rounded-xl bg-orange text-white text-xs font-bold transition-all active:scale-[0.98] shadow-lg shadow-orange/10"
            >
              Ir para o Login
            </button>
          </div>
        </div>
      )}

      {/* Modal Customizado de Confirmação (Mobile Friendly) */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-navy-elevated border border-cream/10 rounded-3xl p-6 w-full max-w-xs text-center space-y-5 shadow-2xl animate-scale-up">
            <div className="mx-auto w-12 h-12 rounded-full bg-orange/10 flex items-center justify-center text-orange">
              <CheckCircle2 size={24} />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-cream">Confirmar dados?</h3>
              <p className="text-xs text-cream-muted leading-relaxed">
                Todos os dados estão corretos para criar sua conta?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-3 rounded-xl border border-cream/10 text-cream-muted text-xs font-semibold hover:text-cream transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeSignUp}
                className="py-3 rounded-xl bg-orange text-white text-xs font-bold transition-all active:scale-[0.98] shadow-lg shadow-orange/10"
              >
                Sim, criar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
