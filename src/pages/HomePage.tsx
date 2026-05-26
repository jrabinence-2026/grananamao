import { Link } from "@tanstack/react-router";
import { Bell, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useStore, fmtBRL } from "@/lib/store";
import { CategoryIcon } from "@/components/CategoryIcon";
import { categoryById } from "@/lib/types";

/**
 * Componente HomePage (Dashboard Inicial).
 * Exibe um resumo geral das finanças do usuário:
 *  - Saldo total, entradas do mês e saídas.
 *  - Lista contendo as 6 transações mais recentes cadastradas.
 */
export function HomePage() {
  const { transactions, user } = useStore();

  // Calcula o total de receitas (income) filtrando e reduzindo o array de transações
  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  
  // Calcula o total de despesas (expense) filtrando e reduzindo o array de transações
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  
  // O saldo líquido corresponde ao total de entradas menos despesas
  const balance = income - expense;
  
  // Seleciona as últimas 6 transações para exibição na lista rápida
  const recent = transactions.slice(0, 6);

  return (
    <div className="bg-navy">
      {/* Cabeçalho da dashboard */}
      <header className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-cream-muted">Bem-vindo de volta</p>
          <h1 className="text-xl font-bold text-cream">Olá, {user?.name ?? "João"}</h1>
        </div>
        <button className="h-10 w-10 rounded-full bg-navy-elevated flex items-center justify-center border border-cream/10">
          <Bell size={18} className="text-cream" />
          <span className="absolute mt-[-14px] ml-4 h-2 w-2 rounded-full bg-orange" />
        </button>
      </header>

      <div className="px-4 space-y-4">
        {/* Card do Saldo Atual */}
        <div className="rounded-2xl bg-navy-elevated p-5 border border-cream/5">
          <p className="text-xs text-cream-muted">Saldo atual</p>
          <p className="text-3xl font-extrabold text-cream mt-1">{fmtBRL(balance)}</p>
          <p className="text-[11px] text-cream-muted mt-2">
            Atualizado agora
          </p>
        </div>

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
          <Link to="/transactions" className="text-xs text-orange font-semibold">Ver tudo</Link>
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
                  <p className="text-sm text-cream font-medium truncate">{t.description}</p>
                  <p className="text-[11px] text-cream-muted">{cat.label} · {formatShort(t.date)}</p>
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
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
