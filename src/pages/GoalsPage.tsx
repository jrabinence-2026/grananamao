import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useStore, fmtBRL } from "@/lib/store";

/**
 * Componente GoalsPage (Metas Financeiras).
 * Exibe a lista de metas financeiras do usuário com barras de progresso percentual.
 * Inclui um modal/sheet inferior para criar novas metas.
 */
export function GoalsPage() {
  const { goals, addGoal } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");

  // Salva a nova meta criada, convertendo strings numéricas e limpando o formulário
  const save = () => {
    const t = parseFloat(target.replace(",", "."));
    const c = parseFloat(current.replace(",", ".")) || 0;
    if (!name || !t) return;
    addGoal({ name, target: t, current: c });
    setName(""); setTarget(""); setCurrent("");
    setOpen(false);
  };

  return (
    <div className="bg-navy min-h-screen">
      {/* Cabeçalho da página de Metas */}
      <header className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-cream">Metas</h1>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-orange text-white text-xs font-semibold"
        >
          <Plus size={14} /> Nova meta
        </button>
      </header>

      {/* Lista de Metas */}
      <div className="px-4 space-y-3">
        {goals.map((g) => {
          // Calcula a porcentagem do progresso atual em relação ao valor final
          const pct = Math.min(100, (g.current / g.target) * 100);
          return (
            <div key={g.id} className="rounded-2xl bg-navy-elevated p-4 border border-cream/5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-cream font-semibold">{g.name}</h3>
                <span className="text-xs text-cream-muted">{Math.round(pct)}%</span>
              </div>
              {/* Barra de Progresso visual */}
              <div className="h-2 rounded-full bg-navy overflow-hidden mb-2">
                <div className="h-full bg-orange rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-cream-muted">
                <span className="text-cream font-semibold">{fmtBRL(g.current)}</span> de {fmtBRL(g.target)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Modal inferior para adição de nova Meta */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Fundo escuro */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          {/* Caixa de diálogo da Meta */}
          <div className="relative w-full max-w-[420px] bg-navy-elevated rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-cream">Nova meta</h2>
              <button onClick={() => setOpen(false)} className="text-cream-muted"><X size={22} /></button>
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da meta"
              className="w-full mb-3 px-4 py-3 rounded-xl bg-navy border border-cream/20 text-cream outline-none" />
            <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Valor alvo (R$)" inputMode="decimal"
              className="w-full mb-3 px-4 py-3 rounded-xl bg-navy border border-cream/20 text-cream outline-none" />
            <input value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Valor atual (R$)" inputMode="decimal"
              className="w-full mb-4 px-4 py-3 rounded-xl bg-navy border border-cream/20 text-cream outline-none" />
            <button onClick={save} className="w-full py-3.5 rounded-xl bg-orange text-white font-semibold">Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
}
