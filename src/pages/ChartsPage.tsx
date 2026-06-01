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
  
  // Tipo de visualização: Entradas, Saídas ou Investimentos
  const [type, setType] = useState<"income" | "expense" | "investment">("expense");

  // Calcula a data de referência baseada no offset de meses
  const ref = useMemo(() => {
    const d = new Date();
    d.setDate(1); // Evita bugs de estouro de dias no final de meses curtos
    d.setMonth(d.getMonth() + offset);
    return d;
  }, [offset]);

  // Filtra as transações do mês, ano e tipo selecionados
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.date + "T12:00:00");
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear() && t.type === type;
  });

  // Cálculo de receitas, despesas e investimentos específicos para o mês de referência (independente do toggle ativo)
  const monthIncome = transactions.filter((t) => {
    const d = new Date(t.date + "T12:00:00");
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear() && t.type === "income";
  }).reduce((s, t) => s + t.amount, 0);

  const monthExpense = transactions.filter((t) => {
    const d = new Date(t.date + "T12:00:00");
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear() && t.type === "expense";
  }).reduce((s, t) => s + t.amount, 0);

  const monthInvestment = transactions.filter((t) => {
    const d = new Date(t.date + "T12:00:00");
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear() && t.type === "investment";
  }).reduce((s, t) => s + t.amount, 0);

  const monthBalance = monthIncome - monthExpense - monthInvestment;
  const maxTypeVal = Math.max(1, monthIncome, monthExpense, monthInvestment);

  // Volume total movimentado no mês (soma de receitas, despesas e investimentos)
  const totalVolume = monthIncome + monthExpense + monthInvestment;
  const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();

  // Cálculo de crescimento de entradas (para o insight)
  const prevRef = new Date(ref);
  prevRef.setMonth(prevRef.getMonth() - 1);
  const prevIncome = transactions.filter((t) => {
    const d = new Date(t.date + "T12:00:00");
    return d.getMonth() === prevRef.getMonth() && d.getFullYear() === prevRef.getFullYear() && t.type === "income";
  }).reduce((s, t) => s + t.amount, 0);

  const currentIncome = monthIncome;
  
  let growthPct = 0;
  if (prevIncome > 0) {
    growthPct = Math.round(((currentIncome - prevIncome) / prevIncome) * 100);
  } else if (currentIncome > 0) {
    growthPct = 100;
  }

  // Agrupa as transações mensais por categorias e ordena pelas de maior valor acumulado
  const byCat = CATEGORIES.map((c) => ({
    cat: c,
    total: monthTx.filter((t) => t.categoryId === c.id).reduce((s, t) => s + t.amount, 0),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);

  const max = Math.max(1, ...byCat.map((x) => x.total));
  const total = byCat.reduce((s, x) => s + x.total, 0);
  const biggest = byCat[0];

  // 1. FUNCIONALIDADE: Calcula o percentual que a maior despesa representa sobre o total
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
    <div className="bg-navy min-h-screen flex flex-col">
      {/* Cabeçalho fixo no topo — título "Relatórios" e navegador de meses permanecem visíveis durante o scroll */}
      <header className="sticky top-0 z-20 bg-navy border-b border-cream/5">
        {/* Linha 1: Título da página */}
        <div className="px-4 pt-12 pb-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-cream">Relatórios</h1>
          
          {/* Toggle Entradas/Saídas/Investimentos no topo */}
          <div className="flex bg-navy-elevated rounded-full p-1 border border-cream/10 shrink-0">
            <button
              onClick={() => setType("income")}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                type === "income" ? "bg-[#4CAF50] text-white" : "text-cream-muted"
              }`}
            >
              Receitas
            </button>
            <button
              onClick={() => setType("expense")}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                type === "expense" ? "bg-orange text-white" : "text-cream-muted"
              }`}
            >
              Despesas
            </button>
            <button
              onClick={() => setType("investment")}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                type === "investment" ? "bg-blue-500 text-white" : "text-cream-muted"
              }`}
            >
              Investimentos
            </button>
          </div>
        </div>

        {/* Linha 2: Navegador de meses — seta esquerda, nome do mês e seta direita — fixo no cabeçalho */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between rounded-xl bg-navy-elevated border border-cream/10 py-2.5 px-3">
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
        </div>
      </header>

      {/* Conteúdo rolável abaixo do cabeçalho fixo */}
      <div className="px-4 space-y-4 py-4 pb-32">
        
        {/* 2. FUNCIONALIDADE: Card de Mini Insights do Mês no topo */}
        <div className="rounded-2xl bg-navy-elevated p-4 border border-cream/5 relative overflow-hidden flex justify-between items-center">
          <div className="relative z-10">
            <p className="text-[10px] tracking-widest text-cream-muted/65 font-bold uppercase mb-1">
              Insight do mês
            </p>
            <p className="text-sm font-medium text-cream">
              {type === "expense" ? (
                biggest ? (
                  <>Maior gasto: <span className="text-orange font-bold">{biggest.cat.label}</span> — <span className="text-cream font-bold">{biggestPct}%</span></>
                ) : (
                  "Nenhum gasto registrado neste mês."
                )
              ) : (
                // Insight de Crescimento de Entradas
                prevIncome === 0 && currentIncome === 0 ? (
                  "Nenhuma receita registrada neste mês."
                ) : growthPct > 0 ? (
                  <>Crescimento de <span className="text-[#4CAF50] font-bold">+{growthPct}%</span> nas entradas em relação ao mês anterior.</>
                ) : growthPct < 0 ? (
                  <>Diminuição de <span className="text-orange font-bold">{growthPct}%</span> nas entradas em relação ao mês anterior.</>
                ) : (
                  <>Sua receita manteve-se igual ao mês passado.</>
                )
              )}
            </p>
          </div>
          {/* Ícone de tendência como marca d'água decorativa no canto do card */}
          <TrendingUp size={44} className="absolute right-3.5 bottom-1 text-cream-muted/10 pointer-events-none" />
        </div>

        {/* Card do Resumo Comparativo Geral */}
        <div className="rounded-2xl bg-navy-elevated p-5 border border-cream/5 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-cream-muted font-medium mb-0.5">
                Balanço Geral
              </p>
              <h3 className="text-sm font-bold text-cream-muted">
                Saldo restante: <span className={monthBalance >= 0 ? "text-[#4CAF50]" : "text-orange"}>{fmtBRL(monthBalance)}</span>
              </h3>
            </div>
          </div>

          {/* Barra Comparativa Geral de Proporção (Única linha de progresso segmentada) */}
          <div className="space-y-2 pt-1">
            <div className="h-3.5 w-full bg-navy rounded-full overflow-hidden flex border border-cream/5 shadow-inner">
              {totalVolume === 0 ? (
                <div className="h-full w-full bg-cream/10 flex items-center justify-center text-[9px] text-cream-muted">
                  Sem dados registrados
                </div>
              ) : (
                <>
                  {monthIncome > 0 && (
                    <div 
                      className="h-full bg-[#4CAF50] transition-all duration-500" 
                      style={{ width: `${(monthIncome / totalVolume) * 100}%` }}
                    />
                  )}
                  {monthExpense > 0 && (
                    <div 
                      className="h-full bg-orange transition-all duration-500" 
                      style={{ width: `${(monthExpense / totalVolume) * 100}%` }}
                    />
                  )}
                  {monthInvestment > 0 && (
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500" 
                      style={{ width: `${(monthInvestment / totalVolume) * 100}%` }}
                    />
                  )}
                </>
              )}
            </div>
            
            {/* Legenda com Porcentagens e Valores */}
            <div className="grid grid-cols-3 gap-2 pt-1.5">
              <div className="bg-navy/35 rounded-lg p-2 border border-cream/5 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF50]" />
                  <span className="text-[10px] text-cream-muted font-medium">Receitas</span>
                </div>
                <span className="text-xs font-bold text-[#4CAF50] block">
                  {totalVolume > 0 ? Math.round((monthIncome / totalVolume) * 100) : 0}%
                </span>
                <span className="text-[9px] text-cream-muted block mt-0.5">
                  {fmtBRL(monthIncome)}
                </span>
              </div>
              <div className="bg-navy/35 rounded-lg p-2 border border-cream/5 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange" />
                  <span className="text-[10px] text-cream-muted font-medium">Despesas</span>
                </div>
                <span className="text-xs font-bold text-orange block">
                  {totalVolume > 0 ? Math.round((monthExpense / totalVolume) * 100) : 0}%
                </span>
                <span className="text-[9px] text-cream-muted block mt-0.5">
                  {fmtBRL(monthExpense)}
                </span>
              </div>
              <div className="bg-navy/35 rounded-lg p-2 border border-cream/5 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] text-cream-muted font-medium">Investido</span>
                </div>
                <span className="text-xs font-bold text-blue-500 block">
                  {totalVolume > 0 ? Math.round((monthInvestment / totalVolume) * 100) : 0}%
                </span>
                <span className="text-[9px] text-cream-muted block mt-0.5">
                  {fmtBRL(monthInvestment)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Donut / Distribuição percentual — Movido para CIMa do gráfico de barras */}
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

        {/* Gráfico de barras simples para total acumulado por categorias */}
        <div className="rounded-2xl bg-navy-elevated p-4 border border-cream/5">
          <p className="text-xs text-cream-muted mb-3">
            {type === "income" ? "Receitas por categoria" : type === "investment" ? "Investimentos por categoria" : "Despesas por categoria"}
          </p>
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
                      className="h-full rounded-full"
                      style={{ 
                        width: `${(x.total / max) * 100}%`,
                        backgroundColor: type === "income" ? "#4CAF50" : type === "investment" ? "#3B82F6" : "#FF5404"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indicador de maior item individual do mês */}
        {biggest && (
          <div className="rounded-2xl bg-navy-elevated p-4 border border-cream/5">
            <p className="text-xs text-cream-muted">
              {type === "income" ? "Maior receita do mês" : type === "investment" ? "Maior investimento do mês" : "Maior gasto do mês"}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-cream font-bold">{biggest.cat.label}</span>
              <span 
                className="font-bold" 
                style={{ color: type === "income" ? "#4CAF50" : type === "investment" ? "#3B82F6" : "#FF5404" }}
              >
                {fmtBRL(biggest.total)}
              </span>
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
