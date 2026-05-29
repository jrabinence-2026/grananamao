import { useMemo, useRef, useState, useEffect } from "react";
import { Filter, Plus, ArrowDownLeft, ArrowUpRight, X } from "lucide-react";
import { useStore, fmtBRL } from "@/lib/store";
import { CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryById, type Transaction } from "@/lib/types";
import { CategoryIcon } from "@/components/CategoryIcon";
import { TransactionSheet } from "@/components/TransactionSheet";

// Tipos de períodos suportados para filtragem de transações
// 'all' = exibe todos sem filtrar por data | 'custom' = data exata escolhida pelo usuário
type Period = "day" | "month" | "all" | "custom";

// 1. FUNCIONALIDADE: Tipo de filtro de direção financeira — nulo significa "todos os tipos"
type TxFilter = "income" | "expense" | null;

/**
 * Componente TransactionsPage.
 * Permite listar todas as transações, filtrar por período (Dia, Mês, Ano),
 * por tipo de movimentação (Entradas ou Saídas) e por categoria.
 * As categorias exibidas nos chips se adaptam automaticamente ao tipo selecionado.
 * Apresenta um botão flutuante para adicionar novos registros.
 */
export function TransactionsPage() {
  const { transactions } = useStore();
  const [period, setPeriod] = useState<Period>("month");
  const [cat, setCat] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);

  // 10. FUNCIONALIDADE: Estados do intervalo de datas (De / Até) usados quando period === 'custom'
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState<string>(today);
  const [dateTo, setDateTo] = useState<string>(today);

  // 2. FUNCIONALIDADE: Estado do filtro de tipo (Entrada / Saída / Todos)
  const [typeFilter, setTypeFilter] = useState<TxFilter>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // 3. FUNCIONALIDADE: Fecha o menu de tipo ao clicar fora dele
  useEffect(() => {
    if (!showTypeMenu) return;
    const handler = (e: MouseEvent) => {
      if (!filterButtonRef.current?.contains(e.target as Node)) {
        setShowTypeMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTypeMenu]);

  // 4. FUNCIONALIDADE: Ao mudar o tipo, limpa o filtro de categoria para evitar chips órfãos
  const handleTypeFilter = (type: TxFilter) => {
    setTypeFilter(type);
    setCat(null);
    setShowTypeMenu(false);
  };

  // 5. FUNCIONALIDADE: Lista de categorias exibida nos chips varia conforme o tipo selecionado
  //    - Nenhum tipo → todas as categorias (despesa + receita deduplicas)
  //    - Entradas → apenas categorias de receita (INCOME_CATEGORIES)
  //    - Saídas → apenas categorias de despesa (EXPENSE_CATEGORIES)
  const visibleCategories = useMemo(() => {
    if (typeFilter === "income") return INCOME_CATEGORIES;
    if (typeFilter === "expense") return EXPENSE_CATEGORIES;
    return CATEGORIES;
  }, [typeFilter]);

  // Filtra as transações baseadas no período, tipo e categoria selecionados
  const filtered = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      // 1. CORREÇÃO: Adiciona T12:00:00 para evitar erro de fuso horário onde o dia cai para a véspera
      const d = new Date(t.date + "T12:00:00");
      // 6. FUNCIONALIDADE: Filtro de período — Dia, Mês, Todo período ou Intervalo de datas
      if (period === "day" && d.toDateString() !== now.toDateString()) return false;
      if (period === "month" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
      // 'all' não aplica filtro de data — exibe todos os lançamentos
      // 'custom' filtra pelo intervalo dateFrom..dateTo (inclusivo em ambos os extremos)
      if (period === "custom") {
        if (dateFrom && t.date < dateFrom) return false;
        if (dateTo && t.date > dateTo) return false;
      }
      if (typeFilter && t.type !== typeFilter) return false;
      if (cat && t.categoryId !== cat) return false;
      return true;
    });
  }, [transactions, period, dateFrom, dateTo, typeFilter, cat]);

  // Agrupa as transações filtradas por data de forma ordenada decrescente
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    [...filtered]
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((t) => {
        const arr = map.get(t.date) ?? [];
        arr.push(t);
        map.set(t.date, arr);
      });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="bg-navy min-h-screen flex flex-col">
      {/* Cabeçalho fixo no topo — título, filtro de tipo, abas de período e chips de categoria */}
      <header className="sticky top-0 z-20 bg-navy border-b border-cream/5">

        {/* Linha 1: Título e botão de filtro de tipo (Entradas / Saídas / Todos) */}
        <div className="px-4 pt-12 pb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-cream">Lançamentos</h1>

          {/* 7. FUNCIONALIDADE: Botão de filtro de tipo com dropdown — muda cor/ícone conforme seleção ativa */}
          <div className="relative" ref={filterButtonRef as any}>
            <button
              ref={filterButtonRef}
              onClick={() => setShowTypeMenu((v) => !v)}
              className={`h-10 px-3 rounded-full flex items-center gap-1.5 border transition-all active:scale-95 ${
                typeFilter
                  ? typeFilter === "income"
                    ? "bg-[#4CAF50]/15 border-[#4CAF50]/50 text-[#4CAF50]"
                    : "bg-orange/15 border-orange/50 text-orange"
                  : "bg-navy-elevated border-cream/10 text-cream"
              }`}
            >
              {typeFilter === "income" ? (
                <ArrowDownLeft size={16} />
              ) : typeFilter === "expense" ? (
                <ArrowUpRight size={16} />
              ) : (
                <Filter size={16} />
              )}
              <span className="text-xs font-semibold">
                {typeFilter === "income" ? "Entradas" : typeFilter === "expense" ? "Saídas" : "Filtrar"}
              </span>
              {/* X para limpar filtro rapidamente — usa span pois já está dentro de um <button> */}
              {typeFilter && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); handleTypeFilter(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); handleTypeFilter(null); } }}
                  className="ml-0.5 rounded-full flex items-center"
                >
                  <X size={13} />
                </span>
              )}
            </button>

            {/* 8. FUNCIONALIDADE: Dropdown de seleção de tipo com animação de entrada */}
            {showTypeMenu && (
              <div className="absolute right-0 top-12 z-30 bg-navy-elevated border border-cream/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 min-w-[160px]">
                {/* Opção: Todos os tipos */}
                <button
                  onClick={() => handleTypeFilter(null)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm transition-colors ${
                    !typeFilter ? "text-cream font-semibold bg-cream/5" : "text-cream-muted hover:bg-cream/5"
                  }`}
                >
                  <Filter size={15} className="opacity-70" />
                  Todos
                </button>

                {/* Opção: Entradas */}
                <button
                  onClick={() => handleTypeFilter("income")}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm transition-colors ${
                    typeFilter === "income" ? "text-[#4CAF50] font-semibold bg-[#4CAF50]/5" : "text-cream-muted hover:bg-cream/5"
                  }`}
                >
                  <ArrowDownLeft size={15} className={typeFilter === "income" ? "text-[#4CAF50]" : "opacity-70"} />
                  Entradas
                </button>

                {/* Opção: Saídas */}
                <button
                  onClick={() => handleTypeFilter("expense")}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm transition-colors ${
                    typeFilter === "expense" ? "text-orange font-semibold bg-orange/5" : "text-cream-muted hover:bg-cream/5"
                  }`}
                >
                  <ArrowUpRight size={15} className={typeFilter === "expense" ? "text-orange" : "opacity-70"} />
                  Saídas
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Linha 2: Abas de período — 4 botões na mesma fileira: Dia, Mês, Tudo, Data */}
        <div className="px-4 pb-3 space-y-2">
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-full bg-navy-elevated border border-cream/10">
            {/* Botão Dia */}
            <button
              onClick={() => setPeriod("day")}
              className={
                "py-2 rounded-full text-xs font-semibold transition-colors " +
                (period === "day" ? "bg-orange text-white" : "text-cream-muted")
              }
            >
              Dia
            </button>

            {/* Botão Mês */}
            <button
              onClick={() => setPeriod("month")}
              className={
                "py-2 rounded-full text-xs font-semibold transition-colors " +
                (period === "month" ? "bg-orange text-white" : "text-cream-muted")
              }
            >
              Mês
            </button>

            {/* Botão Tudo — exibe todos os lançamentos sem filtrar por data */}
            <button
              onClick={() => setPeriod("all")}
              className={
                "py-2 rounded-full text-xs font-semibold transition-colors " +
                (period === "all" ? "bg-orange text-white" : "text-cream-muted")
              }
            >
              Tudo
            </button>

            {/* Botão Data — abre campo de seleção de uma data exata */}
            <button
              onClick={() => setPeriod("custom")}
              className={
                "py-2 rounded-full text-xs font-semibold transition-colors " +
                (period === "custom" ? "bg-orange text-white" : "text-cream-muted")
              }
            >
              Data
            </button>
          </div>

          {/* 11. FUNCIONALIDADE: Dois campos de data (De / Até) — aparecem somente no modo 'custom' */}
          {period === "custom" && (
            <div className="space-y-2">
              {/* Campo "De" — data inicial do intervalo */}
              <div className="flex items-center gap-3 h-11 px-4 rounded-xl bg-navy-elevated border border-orange/40">
                <span className="text-[11px] font-semibold text-orange shrink-0">De</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-cream text-sm h-full"
                />
              </div>
              {/* Campo "Até" — data final do intervalo, não pode ser anterior ao "De" */}
              <div className="flex items-center gap-3 h-11 px-4 rounded-xl bg-navy-elevated border border-orange/40">
                <span className="text-[11px] font-semibold text-orange shrink-0">Até</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-cream text-sm h-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Linha 3: Chips de Categoria — lista adaptada conforme tipo selecionado */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <Chip active={cat === null} onClick={() => setCat(null)} label="Todos" color="#EDDABA" />
            {/* 9. FUNCIONALIDADE: Categorias filtradas dinamicamente pelo tipo selecionado (entradas/saídas/todos) */}
            {visibleCategories.filter(c => c.id !== "outros").map((c) => (
              <Chip
                key={c.id}
                active={cat === c.id}
                onClick={() => setCat(cat === c.id ? null : c.id)}
                label={c.label}
                color={c.color}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Conteúdo rolável — lista agrupada por data */}
      <div className="mt-4 px-4 space-y-4 pb-32">
        {grouped.length === 0 && (
          <p className="text-center text-cream-muted py-12 text-sm">Nenhum lançamento neste período.</p>
        )}
        {grouped.map(([date, items]) => (
          <div key={date}>
            {/* Título de data formatada para o grupo (ex: Hoje, Ontem ou segunda-feira...) */}
            <p className="text-[11px] uppercase tracking-wider text-cream-muted mb-2">{formatGroup(date)}</p>
            <ul className="rounded-2xl bg-navy-elevated divide-y divide-cream/5 border border-cream/5">
              {items.map((t) => {
                const c = categoryById(t.categoryId);
                return (
                  <li key={t.id}>
                    {/* Abre a sheet em modo de edição ao clicar na transação */}
                    <button
                      onClick={() => { setEditing(t); setOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <CategoryIcon id={t.categoryId} />
                      <div className="flex-1 min-w-0">
                        {/* 2. CORREÇÃO: Apenas o "token" (pill) da categoria maior em cima */}
                        <div className="mb-0.5">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold"
                            style={{ backgroundColor: c.color + "22", color: c.color }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.label}
                          </span>
                        </div>
                        {/* Descrição em baixo menor */}
                        {t.description && t.description !== c.label && (
                          <p className="text-[11px] text-cream-muted truncate mt-0.5">{t.description}</p>
                        )}
                      </div>
                      <span
                        className="text-sm font-bold whitespace-nowrap"
                        style={{ color: t.type === "income" ? "#4CAF50" : "#FF5404" }}
                      >
                        {t.type === "income" ? "+" : "-"} {fmtBRL(t.amount)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Botão de Ação Flutuante (FAB) para abrir a sheet de adição */}
      <button
        onClick={() => { setEditing(null); setOpen(true); }}
        className="fixed bottom-24 right-1/2 translate-x-[190px] h-14 w-14 rounded-full bg-orange flex items-center justify-center z-30"
        style={{ boxShadow: "0 8px 20px rgba(255,84,4,0.35)" }}
      >
        <Plus size={26} className="text-white" strokeWidth={2.5} />
      </button>

      {/* Componente do painel de criação/edição */}
      <TransactionSheet open={open} onClose={() => setOpen(false)} editing={editing} />
    </div>
  );
}

/**
 * Componente Chip.
 * Elemento de filtro visual de categoria.
 */
function Chip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors " +
        (active ? "bg-orange border-orange text-white" : "bg-navy-elevated border-cream/15 text-cream-muted")
      }
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? "#fff" : color }} />
      {label}
    </button>
  );
}

/**
 * Utilitário local para calcular e formatar o cabeçalho dos grupos de transações por proximidade de data.
 */
function formatGroup(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });
}
