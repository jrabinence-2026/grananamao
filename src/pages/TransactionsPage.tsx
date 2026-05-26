import { useMemo, useState } from "react";
import { Filter, Plus } from "lucide-react";
import { useStore, fmtBRL } from "@/lib/store";
import { CATEGORIES, categoryById, type Transaction } from "@/lib/types";
import { CategoryIcon } from "@/components/CategoryIcon";
import { TransactionSheet } from "@/components/TransactionSheet";

// Tipos de períodos suportados para filtragem de transações
type Period = "day" | "month" | "year";

/**
 * Componente TransactionsPage.
 * Permite listar todas as transações, filtrar por período (Dia, Mês, Ano)
 * e também por categorias específicas através de chips clicáveis.
 * Apresenta um botão flutuante para adicionar novos registros.
 */
export function TransactionsPage() {
  const { transactions } = useStore();
  const [period, setPeriod] = useState<Period>("month");
  const [cat, setCat] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);

  // Filtra as transações baseadas no período selecionado (dia, mês ou ano atual) e na categoria
  const filtered = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (period === "day" && d.toDateString() !== now.toDateString()) return false;
      if (period === "month" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
      if (period === "year" && d.getFullYear() !== now.getFullYear()) return false;
      if (cat && t.categoryId !== cat) return false;
      return true;
    });
  }, [transactions, period, cat]);

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
    <div className="bg-navy min-h-screen">
      {/* Cabeçalho de lançamentos */}
      <header className="px-4 pt-12 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-cream">Lançamentos</h1>
        <button className="h-10 w-10 rounded-full bg-navy-elevated flex items-center justify-center border border-cream/10">
          <Filter size={18} className="text-cream" />
        </button>
      </header>

      {/* Abas de Seleção de Período (Pills) */}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-2 p-1 rounded-full bg-navy-elevated border border-cream/10">
          {(["day", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={
                "py-2 rounded-full text-sm font-semibold transition-colors " +
                (period === p ? "bg-orange text-white" : "text-cream-muted")
              }
            >
              {p === "day" ? "Dia" : p === "month" ? "Mês" : "Ano"}
            </button>
          ))}
        </div>
      </div>

      {/* Seletor Horizontal de Categorias (Chips) */}
      <div className="mt-4 px-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <Chip active={cat === null} onClick={() => setCat(null)} label="Todos" color="#EDDABA" />
          {CATEGORIES.filter(c => c.id !== "salario" && c.id !== "outros").map((c) => (
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

      {/* Lista Agrupada por Data */}
      <div className="mt-4 px-4 space-y-4">
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
                        <p className="text-sm text-cream font-medium truncate">{t.description}</p>
                        <span
                          className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                          style={{ backgroundColor: c.color + "22", color: c.color }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.label}
                        </span>
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
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const dd = new Date(iso); dd.setHours(0,0,0,0);
  const diff = (today.getTime() - dd.getTime()) / 86400000;
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}
