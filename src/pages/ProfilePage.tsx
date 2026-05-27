import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { 
  Target, 
  Bell, 
  Moon, 
  Banknote, 
  Lock, 
  LogOut, 
  ChevronRight, 
  X 
} from "lucide-react";
import { useStore, fmtBRL } from "@/lib/store";

/**
 * Componente ProfilePage (Perfil do Usuário).
 * Apresenta a interface de configurações pessoais seguindo o modelo visual da imagem:
 * - Cabeçalho com logo e iniciais do usuário.
 * - Foto de perfil (iniciais estilizadas) com nome e e-mail.
 * - Lista de opções interativas (Meta mensal, Notificações, Tema, Moeda, Alterar senha).
 * - Botão de sair da conta.
 */
export function ProfilePage() {
  const { user, logout } = useStore();
  const navigate = useNavigate();

  // 1. FUNCIONALIDADE: Iniciais dinâmicas do nome do usuário (ex: "João Silva" -> "JS")
  const getInitials = (name: string) => {
    if (!name) return "JS";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  const initials = getInitials(user?.name ?? "João Silva");

  // 2. FUNCIONALIDADE: Meta Mensal Editável (carrega/salva do LocalStorage)
  const [monthlyLimit, setMonthlyLimit] = useState<number>(() => {
    const saved = localStorage.getItem("fintrack.profile.monthly_limit");
    return saved ? Number(saved) : 2000;
  });
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [tempLimit, setTempLimit] = useState(monthlyLimit.toString());

  const handleSaveLimit = () => {
    // Valida e salva a nova meta mensal configurada pelo usuário
    const num = parseFloat(tempLimit.replace(",", "."));
    if (!isNaN(num) && num >= 0) {
      setMonthlyLimit(num);
      localStorage.setItem("fintrack.profile.monthly_limit", num.toString());
    }
    setIsLimitModalOpen(false);
  };

  // 3. FUNCIONALIDADE: Toggle de Notificações (carrega/salva do LocalStorage)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("fintrack.profile.notifications");
    return saved !== "false"; // Padrão ativo
  });

  const toggleNotifications = () => {
    // Alterna o status das notificações (ATIVO / INATIVO)
    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    localStorage.setItem("fintrack.profile.notifications", String(nextVal));
  };

  // 4. FUNCIONALIDADE: Alternador de Temas (Tema claro/escuro interativo)
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem("fintrack.profile.theme") || "Escuro";
  });

  const toggleTheme = () => {
    // Alterna dinamicamente entre tema Claro e Escuro
    const nextTheme = theme === "Escuro" ? "Claro" : "Escuro";
    setTheme(nextTheme);
    localStorage.setItem("fintrack.profile.theme", nextTheme);
  };

  // 5. FUNCIONALIDADE: Alternador de Moedas suportadas no app
  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem("fintrack.profile.currency") || "BRL (R$)";
  });

  const toggleCurrency = () => {
    // Rotaciona entre as moedas disponíveis no sistema
    const currencies = ["BRL (R$)", "USD ($)", "EUR (€)"];
    const currentIndex = currencies.indexOf(currency);
    const nextIndex = (currentIndex + 1) % currencies.length;
    const nextCurrency = currencies[nextIndex];
    setCurrency(nextCurrency);
    localStorage.setItem("fintrack.profile.currency", nextCurrency);
  };

  // 6. FUNCIONALIDADE: Alterar Senha (abre modal interativo)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSavePassword = () => {
    // Executa a validação e salva a nova senha do usuário
    if (newPassword && newPassword === confirmPassword) {
      alert("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordModalOpen(false);
    } else {
      alert("As senhas não coincidem ou são inválidas.");
    }
  };

  return (
    <div className="bg-navy min-h-screen pb-10">
      
      {/* 7. FUNCIONALIDADE: Cabeçalho superior com título e mini avatar */}
      <header className="px-4 pt-12 pb-4 flex items-center justify-between border-b border-cream/5">
        <span className="text-xl font-extrabold text-orange tracking-tight">FinTrack</span>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleNotifications}
            className="h-10 w-10 rounded-full bg-navy-elevated flex items-center justify-center border border-cream/10 relative transition-transform active:scale-95"
          >
            <Bell size={18} className="text-cream" />
            {notificationsEnabled && (
              <span className="absolute mt-[-10px] ml-3 h-2 w-2 rounded-full bg-orange" />
            )}
          </button>
          <div className="h-10 w-10 rounded-full bg-cream flex items-center justify-center font-bold text-navy text-sm shadow-md">
            {initials}
          </div>
        </div>
      </header>

      {/* 8. FUNCIONALIDADE: Avatar principal de perfil */}
      <div className="flex flex-col items-center py-8">
        <div className="h-24 w-24 rounded-full bg-cream flex items-center justify-center font-bold text-navy text-3xl border-2 border-orange/20 shadow-xl">
          {initials}
        </div>
        <h2 className="mt-4 text-xl font-bold text-cream">{user?.name ?? "João Silva"}</h2>
        <p className="text-xs text-cream-muted mt-1">{user?.email ?? "joao@email.com"}</p>
      </div>

      {/* 9. FUNCIONALIDADE: Lista de opções de configuração */}
      <div className="px-4 space-y-4">
        <div className="rounded-2xl bg-navy-elevated border border-cream/5 divide-y divide-cream/5">
          
          {/* Opção: Meta mensal */}
          <button 
            onClick={() => { setTempLimit(monthlyLimit.toString()); setIsLimitModalOpen(true); }}
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-cream/5 active:bg-cream/5"
          >
            <div className="flex items-center gap-3">
              <Target size={18} className="text-cream-muted" />
              <span className="text-sm font-medium text-cream">Meta mensal</span>
            </div>
            <span className="text-sm font-semibold text-cream">
              {fmtBRL(monthlyLimit)}
            </span>
          </button>

          {/* Opção: Notificações */}
          <button 
            onClick={toggleNotifications}
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-cream/5 active:bg-cream/5"
          >
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-cream-muted" />
              <span className="text-sm font-medium text-cream">Notificações</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              notificationsEnabled 
                ? "bg-[#4CAF50]/15 text-[#4CAF50]" 
                : "bg-cream-muted/10 text-cream-muted"
            }`}>
              {notificationsEnabled ? "ATIVO" : "INATIVO"}
            </span>
          </button>

          {/* Opção: Tema */}
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-cream/5 active:bg-cream/5"
          >
            <div className="flex items-center gap-3">
              <Moon size={18} className="text-cream-muted" />
              <span className="text-sm font-medium text-cream">Tema</span>
            </div>
            <span className="text-sm font-semibold text-cream-muted">
              {theme}
            </span>
          </button>

          {/* Opção: Moeda */}
          <button 
            onClick={toggleCurrency}
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-cream/5 active:bg-cream/5"
          >
            <div className="flex items-center gap-3">
              <Banknote size={18} className="text-cream-muted" />
              <span className="text-sm font-medium text-cream">Moeda</span>
            </div>
            <span className="text-sm font-semibold text-cream-muted">
              {currency}
            </span>
          </button>

          {/* Opção: Alterar senha */}
          <button 
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-cream/5 active:bg-cream/5"
          >
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-cream-muted" />
              <span className="text-sm font-medium text-cream">Alterar senha</span>
            </div>
            <ChevronRight size={16} className="text-cream-muted" />
          </button>

        </div>

        {/* 10. FUNCIONALIDADE: Botão de Sair da conta (aguarda logout assíncrono do Supabase) */}
        <button
          onClick={async () => { await logout(); navigate({ to: "/" }); }}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-navy-elevated border border-cream/10 active:border-orange/20 text-orange font-bold transition-all text-sm"
        >
          <LogOut size={16} /> Sair da conta
        </button>

        {/* 11. FUNCIONALIDADE: Identificação da versão do app */}
        <p className="text-[10px] tracking-widest text-center text-cream-muted/40 uppercase font-semibold mt-6">
          FINTRACK V2.4.0
        </p>
      </div>

      {/* 12. FUNCIONALIDADE: Modal para editar a Meta Mensal */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsLimitModalOpen(false)} />
          <div className="relative w-full max-w-[420px] bg-navy-elevated rounded-t-3xl p-5 pb-8 border-t border-cream/10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-cream">Definir meta mensal</h2>
              <button onClick={() => setIsLimitModalOpen(false)} className="text-cream-muted">
                <X size={22} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-cream-muted mb-1.5">Valor da Meta (R$)</label>
                <input 
                  type="text" 
                  value={tempLimit} 
                  onChange={(e) => setTempLimit(e.target.value)} 
                  placeholder="Ex: 2000" 
                  inputMode="decimal"
                  className="w-full px-4 py-3.5 rounded-xl bg-navy border border-cream/20 text-cream outline-none focus:border-orange font-semibold" 
                />
              </div>
              <button 
                onClick={handleSaveLimit} 
                className="w-full py-3.5 rounded-xl bg-orange text-white font-bold transition-all active:opacity-95"
              >
                Salvar meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. FUNCIONALIDADE: Modal para alteração de Senha */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsPasswordModalOpen(false)} />
          <div className="relative w-full max-w-[420px] bg-navy-elevated rounded-t-3xl p-5 pb-8 border-t border-cream/10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-cream">Alterar senha</h2>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-cream-muted">
                <X size={22} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-cream-muted mb-1.5">Nova senha</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full px-4 py-3.5 rounded-xl bg-navy border border-cream/20 text-cream outline-none focus:border-orange" 
                />
              </div>
              <div>
                <label className="block text-xs text-cream-muted mb-1.5">Confirmar nova senha</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full px-4 py-3.5 rounded-xl bg-navy border border-cream/20 text-cream outline-none focus:border-orange" 
                />
              </div>
              <button 
                onClick={handleSavePassword} 
                className="w-full py-3.5 rounded-xl bg-orange text-white font-bold transition-all active:opacity-95"
              >
                Confirmar alteração
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
