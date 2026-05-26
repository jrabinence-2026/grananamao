import { useEffect, useState } from "react";
import { CATEGORIES, type Transaction, type TxType } from "@/lib/types";
import { useStore } from "@/lib/store";
import * as LucideIcons from "lucide-react";
import { X } from "lucide-react";

// Dicionário dinâmico de ícones da biblioteca Lucide
type IconMap = Record<string, LucideIcons.LucideIcon>;
const Icons = LucideIcons as unknown as IconMap;

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Transaction | null; // Transação em edição (se houver)
}

/**
 * Componente TransactionSheet (Formulário de Lançamento).
 * Exibido como um painel inferior (bottom sheet) que desliza de baixo para cima.
 * Permite a criação de novos lançamentos de despesa/receita ou a edição/exclusão de transações existentes.
 */
export function TransactionSheet({ open, onClose, editing }: Props) {
  const { addTx, updateTx, deleteTx } = useStore();
  const [type, setType] = useState<TxType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState("alimentacao");

  // Atualiza ou reinicializa os campos do formulário ao abrir ou alterar a transação selecionada
  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setDescription(editing.description);
      setAmount(String(editing.amount));
      setDate(editing.date);
      setCategoryId(editing.categoryId);
    } else if (open) {
      setType("expense");
      setDescription("");
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setCategoryId("alimentacao");
    }
  }, [editing, open]);

  // Retorna nulo se o painel não estiver configurado para ser exibido (aberto)
  if (!open) return null;

  // Lógica de salvar transação
  const save = () => {
    const value = parseFloat(amount.replace(",", "."));
    if (!description || !value || value <= 0) return;
    const payload = { type, description, amount: value, date, categoryId };
    if (editing) updateTx({ ...editing, ...payload });
    else addTx(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Fundo escurecido semi-transparente que fecha a sheet ao clicar fora */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      {/* Container principal da sheet com rolagem interna e animação de subida */}
      <div
        className="relative w-full max-w-[420px] bg-navy-elevated rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom"
        style={{ maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-cream">
            {editing ? "Editar lançamento" : "Novo lançamento"}
          </h2>
          <button onClick={onClose} className="text-cream-muted">
            <X size={22} />
          </button>
        </div>

        {/* Alternador de Tipo: Despesa ou Receita */}
        <div className="grid grid-cols-2 p-1 rounded-full bg-navy mb-5 border border-cream/10">
          {(["income", "expense"] as TxType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={
                "py-2.5 rounded-full text-sm font-semibold transition-colors " +
                (type === t ? "bg-orange text-white" : "text-cream-muted")
              }
            >
              {t === "income" ? "Receita" : "Despesa"}
            </button>
          ))}
        </div>

        {/* Campo de entrada para Valor (numérico/decimal) */}
        <label className="block text-xs text-cream-muted mb-2">Valor</label>
        <div className="flex items-baseline gap-2 mb-5 px-4 py-4 rounded-xl bg-navy border border-cream/20">
          <span className="text-cream-muted text-lg">R$</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="bg-transparent outline-none text-cream text-3xl font-bold w-full"
          />
        </div>

        {/* Campo de entrada para Descrição */}
        <label className="block text-xs text-cream-muted mb-2">Descrição</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Almoço"
          className="w-full mb-4 px-4 py-3 rounded-xl bg-navy border border-cream/20 text-cream outline-none"
        />

        {/* Campo de entrada para Data */}
        <label className="block text-xs text-cream-muted mb-2">Data</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full mb-5 px-4 py-3 rounded-xl bg-navy border border-cream/20 text-cream outline-none"
        />

        {/* Seleção de Categorias */}
        <label className="block text-xs text-cream-muted mb-2">Categoria</label>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {CATEGORIES.map((c) => {
            const Icon = Icons[c.icon] ?? Icons.Circle;
            const active = c.id === categoryId;
            return (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={
                  "flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors " +
                  (active
                    ? "border-orange bg-orange/10"
                    : "border-cream/15 bg-navy")
                }
              >
                <span
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: c.color + "22", color: c.color }}
                >
                  <Icon size={16} />
                </span>
                <span className="text-[10px] text-cream-muted leading-tight text-center">
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Botões de Ação Final */}
        <button
          onClick={save}
          className="w-full py-3.5 rounded-xl bg-orange text-white font-semibold"
        >
          Salvar
        </button>

        {/* Botão de Excluir (exibido apenas se estiver em modo de edição) */}
        {editing && (
          <button
            onClick={() => {
              deleteTx(editing.id);
              onClose();
            }}
            className="w-full mt-2 py-3 rounded-xl border border-orange/40 text-orange font-semibold"
          >
            Excluir
          </button>
        )}
      </div>
    </div>
  );
}
