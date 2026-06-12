import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, ArrowDownLeft, ArrowUpRight, TrendingUp, Pencil, Eye, EyeOff } from "lucide-react";
import { useStore, fmtBRL } from "@/lib/store";
import { CategoryIcon } from "@/components/CategoryIcon";
import { categoryById } from "@/lib/types";
import { NotificationSheet } from "@/components/NotificationSheet";
import { supabase } from "@/lib/supabase";

// 1. FUNCIONALIDADE: Definição dos avatares padrões da plataforma (Dicebear Adventurer e Croodles)
const DEFAULT_AVATARS = [
  // Adventurer avatars
  { id: "adv_1", label: "Félix", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix" },
  { id: "adv_2", label: "Aneka", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka" },
  { id: "adv_3", label: "Jack", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack" },
  { id: "adv_4", label: "Lilith", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Lilith" },
  { id: "adv_5", label: "Ryan", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Ryan" },
  { id: "adv_6", label: "Zoey", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoey" },
  // Croodles avatars
  { id: "cro_1", label: "Oliver", url: "https://api.dicebear.com/7.x/croodles/svg?seed=Oliver" },
  { id: "cro_2", label: "Jack C.", url: "https://api.dicebear.com/7.x/croodles/svg?seed=Jack" },
  { id: "cro_3", label: "Aneka C.", url: "https://api.dicebear.com/7.x/croodles/svg?seed=Aneka" },
  { id: "cro_4", label: "Felix C.", url: "https://api.dicebear.com/7.x/croodles/svg?seed=Felix" },
  { id: "cro_5", label: "Ryan C.", url: "https://api.dicebear.com/7.x/croodles/svg?seed=Ryan" },
  { id: "cro_6", label: "Zoey C.", url: "https://api.dicebear.com/7.x/croodles/svg?seed=Zoey" },
];

export type FilterType = "today" | "month" | "last_month" | "year" | "all" | "custom";

const FILTER_OPTIONS = [
  { id: "today", label: "Hoje" },
  { id: "month", label: "Mês Atual" },
  { id: "last_month", label: "Mês Passado" },
  { id: "year", label: "Este Ano" },
  { id: "all", label: "Tudo" },
  { id: "custom", label: "Personalizado" },
];

/**
 * Componente HomePage (Dashboard Inicial).
 * Exibe um resumo geral das finanças do usuário:
 *  - Saldo total, entradas do mês e saídas.
 *  - Lista contendo as 6 transações mais recentes cadastradas.
 */
export function HomePage() {
  const { transactions, user, monthlyLimits, updateMonthlyLimit } = useStore();
  const [filterType, setFilterType] = useState<FilterType>("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState("");

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const [showBalance, setShowBalance] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("fintrack.show_balance");
      return cached !== "false";
    }
    return true;
  });

  const toggleShowBalance = () => {
    setShowBalance((prev) => {
      const next = !prev;
      localStorage.setItem("fintrack.show_balance", String(next));
      return next;
    });
  };

  const checkUnreadNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id")
      .eq("is_active", true);

    if (!error && data) {
      let seenList: string[] = [];
      try {
        const stored = localStorage.getItem("fintrack_seen_notifications");
        seenList = stored ? JSON.parse(stored) : [];
      } catch {}
      // Badge shows if there are active notifications not yet seen by this user
      const unread = data.some((n) => !seenList.includes(n.id));
      setHasUnreadNotifications(unread);
    }
  };

  useEffect(() => {
    checkUnreadNotifications();

    // Solicita permissão de notificação do navegador
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Helper: remove uma notificação das listas de visto/limpo para ela reaparecer
    const resurrectNotification = (id: string) => {
      try {
        const seenRaw = localStorage.getItem("fintrack_seen_notifications");
        const seen: string[] = seenRaw ? JSON.parse(seenRaw) : [];
        localStorage.setItem("fintrack_seen_notifications", JSON.stringify(seen.filter((s) => s !== id)));

        const clearedRaw = localStorage.getItem("fintrack_cleared_notifications");
        const cleared: string[] = clearedRaw ? JSON.parse(clearedRaw) : [];
        localStorage.setItem("fintrack_cleared_notifications", JSON.stringify(cleared.filter((c) => c !== id)));
      } catch {}
    };

    // Escuta em tempo real INSERT e UPDATE na tabela notifications
    const channel = supabase
      .channel("notif-home-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setHasUnreadNotifications(true);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("GranaNaMão — Novo Aviso", {
              body: (payload.new as any)?.message ?? "Você tem um novo aviso.",
              icon: "/img/pwalogo.png",
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const updated = payload.new as any;
          if (!updated?.is_active) return; // ignora se foi desativado

          // Remove das listas locais para reaparecer no painel
          resurrectNotification(updated.id);

          // Reacende o badge
          setHasUnreadNotifications(true);

          // Notificação push
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("GranaNaMão — Aviso Atualizado", {
              body: updated.message ?? "Um aviso foi atualizado.",
              icon: "/img/pwalogo.png",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 2. FUNCIONALIDADE: Abrevia o nome para obter iniciais se necessário
  const getInitials = (name: string) => {
    if (!name) return "JS";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  const initials = getInitials(user?.name ?? "João Silva");

  // 3. FUNCIONALIDADE: Renderiza o avatar do usuário de forma minimalista na Home
  const renderAvatar = () => {
    const avatarKey = user?.avatar_key;
    
    if (avatarKey === "custom" && user?.custom_avatar_base64) {
      return (
        <img 
          src={user.custom_avatar_base64} 
          alt="Avatar"
          className="h-10 w-10 rounded-full object-cover shadow-md border border-cream/10 shrink-0"
        />
      );
    }

    const selected = DEFAULT_AVATARS.find(a => a.id === avatarKey);
    if (selected) {
      return (
        <img 
          src={selected.url} 
          alt={selected.label}
          className="h-10 w-10 rounded-full object-cover shadow-md bg-navy-elevated border border-cream/10 shrink-0"
        />
      );
    }

    return (
      <div className="h-10 w-10 rounded-full bg-cream flex items-center justify-center font-bold text-navy text-sm shadow-md shrink-0">
        {initials}
      </div>
    );
  };

  // Filtra as transações com base no período selecionado
  const getFilteredTransactions = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const todayStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Mês Passado
    let lastMonthYear = currentYear;
    let lastMonth = currentMonth - 1;
    if (lastMonth < 0) {
      lastMonth = 11;
      lastMonthYear -= 1;
    }

    return transactions.filter((t) => {
      const [tYear, tMonth] = t.date.split("-").map(Number);
      switch (filterType) {
        case "today":
          return t.date === todayStr;
        case "month":
          return tYear === currentYear && (tMonth - 1) === currentMonth;
        case "last_month":
          return tYear === lastMonthYear && (tMonth - 1) === lastMonth;
        case "year":
          return tYear === currentYear;
        case "custom": {
          let match = true;
          if (customStartDate) match = match && t.date >= customStartDate;
          if (customEndDate) match = match && t.date <= customEndDate;
          return match;
        }
        case "all":
        default:
          return true;
      }
    });
  };

  const filteredTransactions = getFilteredTransactions();

  // Calcula o total de receitas (income) filtrando e reduzindo o array de transações
  const income = filteredTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  
  // Calcula o total de despesas (expense) filtrando e reduzindo o array de transações
  const expense = filteredTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // Calcula o total de investimentos (investment) filtrando e reduzindo o array de transações
  const investment = filteredTransactions.filter((t) => t.type === "investment").reduce((s, t) => s + t.amount, 0);
  
  // O saldo líquido corresponde ao total de entradas menos despesas e investimentos
  const balance = income - expense - investment;
  
  // Seleciona as últimas 6 transações filtradas para exibição na lista rápida
  const recent = filteredTransactions.slice(0, 6);

  // Obtém a chave do mês ativo (formato YYYY-MM) com base no filtro
  const getActiveMonthStr = () => {
    const now = new Date();
    if (filterType === "last_month") {
      let m = now.getMonth() - 1;
      let y = now.getFullYear();
      if (m < 0) {
        m = 11;
        y -= 1;
      }
      return `${y}-${String(m + 1).padStart(2, '0')}`;
    }
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const activeMonthStr = getActiveMonthStr();
  const monthlyLimit = monthlyLimits[activeMonthStr] ?? user?.monthly_limit ?? 0;

  // 5. FUNCIONALIDADE: Calcula as despesas no período selecionado
  const periodExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const handleSaveLimit = () => {
    const val = parseFloat(limitInput);
    if (!isNaN(val) && val >= 0) {
      updateMonthlyLimit(activeMonthStr, val);
    }
    setIsEditingLimit(false);
  };

  const getLimitLabel = () => {
    switch (filterType) {
      case "today": return "Gastos de Hoje";
      case "month": return "Meta de gasto mensal";
      case "last_month": return "Meta de gasto (Mês Passado)";
      case "year": return "Gastos do Ano";
      case "custom": return "Gastos no Período";
      case "all": return "Gastos Totais";
      default: return "Meta de gasto";
    }
  };

  return (

    <div className="bg-navy min-h-screen flex flex-col">
      {/* 6. FUNCIONALIDADE: Cabeçalho fixo no topo — permanece visível durante o scroll (sticky header) */}
      <header className="sticky top-0 z-20 bg-navy px-4 pt-12 pb-4 flex items-center justify-between border-b border-cream/5">
        <div className="flex items-center gap-3">
          {renderAvatar()}
          <div>
            <p className="text-xs text-cream-muted">Bem-vindo de volta</p>
            <h1 className="text-xl font-bold text-cream">Olá, {user?.name ?? "João"}</h1>
          </div>
        </div>
        <button 
          onClick={() => setIsNotificationOpen(true)}
          className="h-10 w-10 rounded-full bg-navy-elevated flex items-center justify-center border border-cream/10 relative active:scale-95 transition-transform"
        >
          <Bell size={18} className="text-cream" />
          {hasUnreadNotifications && (
            <span className="absolute mt-[-10px] ml-3 h-2 w-2 rounded-full bg-orange animate-pulse" />
          )}
        </button>
      </header>

      {/* Barra de Filtros de Período (Pills horizontais) */}
      <div className="px-4 pt-2 pb-1 shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTER_OPTIONS.map((opt) => {
            const active = filterType === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setFilterType(opt.id as FilterType)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                  active
                    ? "bg-orange text-white border-orange shadow-md shadow-orange/20"
                    : "bg-navy-elevated text-cream-muted border-cream/5 hover:text-cream"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Inputs de Data Personalizada (com transição suave) */}
        {filterType === "custom" && (
          <div className="mt-3 p-4 rounded-2xl bg-navy-elevated border border-cream/5 flex gap-3 animate-fade-in">
            <div className="flex-1">
              <label className="block text-[10px] text-cream-muted font-bold uppercase mb-1">De</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="block w-full bg-navy border border-cream/10 rounded-xl px-3 py-2.5 text-xs text-cream focus:outline-none focus:border-orange transition-all appearance-none min-h-[40px]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-cream-muted font-bold uppercase mb-1">Até</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="block w-full bg-navy border border-cream/10 rounded-xl px-3 py-2.5 text-xs text-cream focus:outline-none focus:border-orange transition-all appearance-none min-h-[40px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo rolável abaixo do cabeçalho fixo */}
      <div className="px-4 space-y-4 py-4">
        {/* Card do Saldo Atual */}
        <div className="rounded-2xl bg-navy-elevated p-5 border border-cream/5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-cream-muted">Saldo atual</p>
            <button
              onClick={toggleShowBalance}
              className="text-cream-muted hover:text-cream transition-colors p-1"
              title={showBalance ? "Ocultar saldo" : "Mostrar saldo"}
            >
              {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          <p className="text-3xl font-extrabold text-cream mt-1">
            {showBalance ? fmtBRL(balance) : "R$ •••••"}
          </p>
          <p className="text-[11px] text-cream-muted mt-2">
            Atualizado agora
          </p>
        </div>

        {/* Card da Meta de Gasto Mensal */}
        {user && (
          <div className="rounded-2xl bg-navy-elevated p-5 border border-cream/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cream-muted font-medium">{getLimitLabel()}</span>
              {isEditingLimit ? (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <span className="text-cream-muted text-xs">R$</span>
                  <input
                    type="number"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    className="w-16 bg-navy border border-cream/20 rounded-md px-1.5 py-0.5 text-xs text-cream text-right focus:outline-none focus:border-orange"
                    placeholder="0"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveLimit();
                      if (e.key === 'Escape') setIsEditingLimit(false);
                    }}
                  />
                  <button 
                    onClick={handleSaveLimit}
                    className="px-2 py-0.5 rounded-md bg-orange text-white text-[10px] font-bold"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-cream font-bold">
                    {monthlyLimit > 0 ? `${fmtBRL(periodExpenses)} / ${fmtBRL(monthlyLimit)}` : `${fmtBRL(periodExpenses)} / R$ 0,00`}
                  </span>
                  <button 
                    onClick={() => {
                      setLimitInput(monthlyLimit > 0 ? String(monthlyLimit) : "");
                      setIsEditingLimit(true);
                    }}
                    className="text-cream-muted hover:text-orange transition-colors p-1"
                    title="Editar meta"
                  >
                    <Pencil size={11} />
                  </button>
                </div>
              )}
            </div>
            
            {/* Barra de progresso (exibida apenas se houver uma meta maior que zero) */}
            {monthlyLimit > 0 && (
              <>
                <div className="w-full h-2 bg-navy rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      periodExpenses >= monthlyLimit 
                        ? "bg-orange" 
                        : periodExpenses >= monthlyLimit * 0.8 
                          ? "bg-yellow-500" 
                          : "bg-[#4CAF50]" 
                    }`}
                    style={{ width: `${Math.min((periodExpenses / monthlyLimit) * 100, 100)}%` }}
                  />
                </div>

                {/* Aviso minimalista de consumo */}
                {periodExpenses >= monthlyLimit ? (
                  <p className="text-[10px] text-orange font-bold pl-0.5">
                    ⚠️ Meta estourada! Controle seus novos gastos.
                  </p>
                ) : periodExpenses >= monthlyLimit * 0.8 ? (
                  <p className="text-[10px] text-yellow-500 font-bold pl-0.5">
                    ⚠️ Atenção: você consumiu mais de 80% da meta.
                  </p>
                ) : (
                  <p className="text-[10px] text-[#4CAF50] font-medium pl-0.5">
                    ✅ Gastos dentro da meta estabelecida.
                  </p>
                )}
              </>
            )}
          </div>
        )}


        {/* Estatísticas rápidas de Entrada, Saída e Investimento */}
        <div className="grid grid-cols-3 gap-2">
          {/* Card de Entradas */}
          <div className="rounded-2xl bg-navy-elevated p-3 border border-cream/5 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(76,175,80,0.15)" }}>
                <ArrowDownLeft size={12} style={{ color: "#4CAF50" }} />
              </span>
              <span className="text-[10px] text-cream-muted font-medium truncate">Entradas</span>
            </div>
            <p className="text-sm font-bold truncate" style={{ color: "#4CAF50" }}>
              {showBalance ? fmtBRL(income) : "R$ •••••"}
            </p>
          </div>
          {/* Card de Saídas */}
          <div className="rounded-2xl bg-navy-elevated p-3 border border-cream/5 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,84,4,0.15)" }}>
                <ArrowUpRight size={12} className="text-orange" />
              </span>
              <span className="text-[10px] text-cream-muted font-medium truncate">Saídas</span>
            </div>
            <p className="text-sm font-bold text-orange truncate">
              {showBalance ? fmtBRL(expense) : "R$ •••••"}
            </p>
          </div>
          {/* Card de Investimento */}
          <div className="rounded-2xl bg-navy-elevated p-3 border border-cream/5 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(59,130,246,0.15)" }}>
                <TrendingUp size={12} className="text-blue-500" />
              </span>
              <span className="text-[10px] text-cream-muted font-medium truncate">Investido</span>
            </div>
            <p className="text-sm font-bold text-blue-500 truncate">
              {showBalance ? fmtBRL(investment) : "R$ •••••"}
            </p>
          </div>
        </div>

        {/* Cabeçalho da lista de transações recentes */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-base font-bold text-cream">Transações recentes</h2>
          <Link to="/home" search={{ tab: "transactions" }} className="text-xs text-orange font-semibold">Ver tudo</Link>
        </div>

        {/* Lista de Transações Recentes */}
        <ul className="rounded-2xl bg-navy-elevated divide-y divide-cream/5 border border-cream/5">
          {recent.map((t) => {
            const cat = categoryById(t.categoryId);
            return (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                {/* Ícone estilizado correspondente à categoria da transação */}
                <CategoryIcon id={t.categoryId} />
                <div className="flex-1 min-w-0">
                  <div className="mb-1">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold"
                      style={{ backgroundColor: cat.color + "22", color: cat.color }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-cream-muted truncate">
                    {formatShort(t.date)} {t.description && t.description !== cat.label ? `· ${t.description}` : ""}
                  </p>
                </div>
                {/* Valor formatado em BRL com sinal correspondente */}
                <span
                  className="text-sm font-semibold"
                  style={{ color: t.type === "income" ? "#4CAF50" : "#FF5404" }}
                >
                  {t.type === "income" ? "+" : "-"} {showBalance ? fmtBRL(t.amount) : "R$ •••••"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <NotificationSheet 
        open={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
        onNotificationsUpdated={checkUnreadNotifications} 
      />
    </div>
  );
}

/**
 * Utilitário local para formatação rápida de datas no formato: 25 de abr.
 */
function formatShort(iso: string) {
  // 1. CORREÇÃO: Adiciona T12:00:00 para evitar erro de fuso horário onde o dia cai para a véspera
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
