import { Link } from "@tanstack/react-router";
import { Bell, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useStore, fmtBRL } from "@/lib/store";
import { CategoryIcon } from "@/components/CategoryIcon";
import { categoryById } from "@/lib/types";

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


/**
 * Componente HomePage (Dashboard Inicial).
 * Exibe um resumo geral das finanças do usuário:
 *  - Saldo total, entradas do mês e saídas.
 *  - Lista contendo as 6 transações mais recentes cadastradas.
 */
export function HomePage() {
  const { transactions, user } = useStore();

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

  // Calcula o total de receitas (income) filtrando e reduzindo o array de transações
  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  
  // Calcula o total de despesas (expense) filtrando e reduzindo o array de transações
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  
  // O saldo líquido corresponde ao total de entradas menos despesas
  const balance = income - expense;
  
  // Seleciona as últimas 6 transações para exibição na lista rápida
  const recent = transactions.slice(0, 6);

  // 4. FUNCIONALIDADE: Meta de gasto mensal (carrega valor do usuário no store/Supabase)
  const monthlyLimit = user?.monthly_limit ?? 0;

  // 5. FUNCIONALIDADE: Calcula as despesas apenas do mês atual
  const currentMonthExpenses = transactions
    .filter((t) => {
      if (t.type !== "expense") return false;
      const tDate = new Date(t.date);
      const now = new Date();
      return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    })
    .reduce((s, t) => s + t.amount, 0);

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
        <button className="h-10 w-10 rounded-full bg-navy-elevated flex items-center justify-center border border-cream/10 relative">
          <Bell size={18} className="text-cream" />
          <span className="absolute mt-[-10px] ml-3 h-2 w-2 rounded-full bg-orange" />
        </button>
      </header>

      {/* Conteúdo rolável abaixo do cabeçalho fixo */}
      <div className="px-4 space-y-4 py-4">
        {/* Card do Saldo Atual */}
        <div className="rounded-2xl bg-navy-elevated p-5 border border-cream/5">
          <p className="text-xs text-cream-muted">Saldo atual</p>
          <p className="text-3xl font-extrabold text-cream mt-1">{fmtBRL(balance)}</p>
          <p className="text-[11px] text-cream-muted mt-2">
            Atualizado agora
          </p>
        </div>

        {/* Card da Meta de Gasto Mensal (caso definida) */}
        {monthlyLimit > 0 && (
          <div className="rounded-2xl bg-navy-elevated p-5 border border-cream/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cream-muted font-medium">Meta de gasto mensal</span>
              <span className="text-cream font-bold">
                {fmtBRL(currentMonthExpenses)} / {fmtBRL(monthlyLimit)}
              </span>
            </div>
            
            {/* Barra de progresso */}
            <div className="w-full h-2 bg-navy rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  currentMonthExpenses >= monthlyLimit 
                    ? "bg-orange" 
                    : currentMonthExpenses >= monthlyLimit * 0.8 
                      ? "bg-yellow-500" 
                      : "bg-[#4CAF50]" 
                }`}
                style={{ width: `${Math.min((currentMonthExpenses / monthlyLimit) * 100, 100)}%` }}
              />
            </div>

            {/* Aviso minimalista de consumo */}
            {currentMonthExpenses >= monthlyLimit ? (
              <p className="text-[10px] text-orange font-bold pl-0.5">
                ⚠️ Meta estourada! Controle seus novos gastos.
              </p>
            ) : currentMonthExpenses >= monthlyLimit * 0.8 ? (
              <p className="text-[10px] text-yellow-500 font-bold pl-0.5">
                ⚠️ Atenção: você consumiu mais de 80% da meta.
              </p>
            ) : (
              <p className="text-[10px] text-[#4CAF50] font-medium pl-0.5">
                ✅ Gastos dentro da meta estabelecida.
              </p>
            )}
          </div>
        )}

        {/* Estatísticas rápidas de Entrada e Saída */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card de Entradas */}
          <div className="rounded-2xl bg-navy-elevated p-4 border border-cream/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(76,175,80,0.15)" }}>
                <ArrowDownLeft size={14} style={{ color: "#4CAF50" }} />
              </span>
              <span className="text-xs text-cream-muted">Entradas</span>
            </div>
            <p className="text-lg font-bold" style={{ color: "#4CAF50" }}>{fmtBRL(income)}</p>
          </div>
          {/* Card de Saídas */}
          <div className="rounded-2xl bg-navy-elevated p-4 border border-cream/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,84,4,0.15)" }}>
                <ArrowUpRight size={14} className="text-orange" />
              </span>
              <span className="text-xs text-cream-muted">Saídas</span>
            </div>
            <p className="text-lg font-bold text-orange">{fmtBRL(expense)}</p>
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
                  {t.type === "income" ? "+" : "-"} {fmtBRL(t.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
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
