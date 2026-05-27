import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react"; // Importação do TrendingUp para a marca d'água
import { useStore, fmtBRL } from "@/lib/store";
import { CATEGORIES } from "@/lib/types";

/**
 * Componente ChartsPage (Relatórios).
 * Apresenta gráficos e métricas de despesas agrupadas por categorias do mês selecionado.
 * Permite navegar entre meses de forma retroativa ou futura utilizando botões de navegação lateral.
 */
export function ChartsPage() {
  const { transactions } = useStore();
  
  // Controle de deslocamento de meses em relação ao mês atual
  const [offset, setOffset] = useState(0);

  // Calcula a data de referência baseada no offset de meses
  const ref = useMemo(() => {
    const d = new Date();
    d.setDate(1); // Evita bugs de estouro de dias no final de meses curtos
    d.setMonth(d.getMonth() + offset);
    return d;
  }, [offset]);

  // Filtra as transações de despesa do mês e ano da data de referência
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear() && t.type === "expense";
  });

  // Agrupa as despesas mensais por categorias e ordena pelas de maior valor acumulado
  const byCat = CATEGORIES.map((c) => ({
    cat: c,
    total: monthTx.filter((t) => t.categoryId === c.id).reduce((s, t) => s + t.amount, 0),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);

  const max = Math.max(1, ...byCat.map((x) => x.total));
  const total = byCat.reduce((s, x) => s + x.total, 0);
  const biggest = byCat[0];

  // 1. FUNCIONALIDADE: Calcula o percentual que a maior despesa representa sobre o total de gastos do mês
  const biggestPct = total > 0 && biggest ? Math.round((biggest.total / total) * 100) : 0;

  // Mapeia e segmenta o acumulado para desenhar o gráfico Donut de rosca
  let acc = 0;
  const segments = byCat.map((x) => {
    const frac = x.total / (total || 1);
    const start = acc;
    acc += frac;
    return { ...x, start, end: acc };
  });

  return (
    <div className="bg-navy min-h-screen">
      {/* Título da Página */}
      <header className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-cream">Relatórios</h1>
      </header>

      {/* Navegador de Meses */}
      <div className="px-4 mb-5 flex items-center justify-between rounded-xl bg-navy-elevated border border-cream/10 py-2.5 px-3 mx-4">
        <button onClick={() => setOffset((o) => o - 1)} className="text-cream-muted p-1">
          <ChevronLeft size={20} />
        </button>
        <span className="text-cream font-semibold capitalize">
          {ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </span>
        <button onClick={() => setOffset((o) => o + 1)} className="text-cream-muted p-1">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="px-4 space-y-4">
        
        {/* 2. FUNCIONALIDADE: Card de Mini Insights do Mês no topo */}
        <div className="rounded-2xl bg-navy-elevated p-4 border border-cream/5 relative overflow-hidden flex justify-between items-center">
          <div className="relative z-10">
            <p className="text-[10px] tracking-widest text-cream-muted/65 font-bold uppercase mb-1">
              Insight do mês
            </p>
            <p className="text-sm font-medium text-cream">
              {biggest ? (
                <>
                  Maior gasto: <span className="text-orange font-bold">{biggest.cat.label}</span> — <span className="text-cream font-bold">{biggestPct}%</span>
                </>
              ) : (
                "Nenhum gasto registrado neste mês."
              )}
            </p>
          </div>
          {/* Ícone de tendência como marca d'água decorativa no canto do card */}
          <TrendingUp size={44} className="absolute right-3.5 bottom-1 text-cream-muted/10 pointer-events-none" />
        </div>

        {/* Gráfico de barras simples para gasto acumulado por categorias */}
        <div className="rounded-2xl bg-navy-elevated p-4 border border-cream/5">
          <p className="text-xs text-cream-muted mb-3">Despesas por categoria</p>
          {byCat.length === 0 ? (
            <p className="text-center text-cream-muted py-8 text-sm">Sem dados neste mês.</p>
          ) : (
            <div className="space-y-3">
              {byCat.map((x) => (
                <div key={x.cat.id}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-cream">{x.cat.label}</span>
                    <span className="text-cream-muted">{fmtBRL(x.total)}</span>
                  </div>
                  {/* Barra de preenchimento proporcional */}
                  <div className="h-2 rounded-full bg-navy overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange"
                      style={{ width: `${(x.total / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gráfico de Donut / Distribuição percentual */}
        <div className="rounded-2xl bg-navy-elevated p-4 border border-cream/5">
          <p className="text-xs text-cream-muted mb-3">Distribuição</p>
          {segments.length === 0 ? (
            <p className="text-center text-cream-muted py-8 text-sm">Sem dados.</p>
          ) : (
            <div className="flex items-center gap-5">
              <Donut segments={segments} />
              <ul className="flex-1 space-y-2">
                {segments.slice(0, 5).map((s) => (
                  <li key={s.cat.id} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.cat.color }} />
                    <span className="text-cream flex-1 truncate">{s.cat.label}</span>
                    <span className="text-cream-muted">{Math.round((s.total / total) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Indicador de maior despesa individual do mês */}
        {biggest && (
          <div className="rounded-2xl bg-navy-elevated p-4 border border-cream/5">
            <p className="text-xs text-cream-muted">Maior gasto do mês</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-cream font-bold">{biggest.cat.label}</span>
              <span className="text-orange font-bold">{fmtBRL(biggest.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Componente Donut auxiliar.
 * Desenha círculos sobrepostos em SVG e utiliza as propriedades strokeDasharray e strokeDashoffset
 * para criar pedaços proporcionais de arco, simulando um gráfico Donut (gráfico de rosca).
 */
function Donut({ segments }: { segments: { cat: { color: string }; start: number; end: number }[] }) {
  const r = 38; // Raio do círculo
  const c = 2 * Math.PI * r; // Circunferência total do círculo
  return (
    <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
      {/* Círculo de fundo escuro */}
      <circle cx="50" cy="50" r={r} fill="none" stroke="#0F2632" strokeWidth="14" />
      {/* Segmentos de cores das categorias */}
      {segments.map((s, i) => {
        const len = (s.end - s.start) * c;
        const offset = -s.start * c;
        return (
          <circle
            key={i}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={s.cat.color}
            strokeWidth="14"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={offset}
          />
        );
      })}
    </svg>
  );
}
