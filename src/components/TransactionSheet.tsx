import { useEffect, useState } from "react";
import { 
  CATEGORIES, 
  INCOME_CATEGORIES, 
  EXPENSE_CATEGORIES, 
  type Transaction, 
  type TxType 
} from "@/lib/types"; // Importação das novas listas específicas de categorias
import { useStore } from "@/lib/store";
import * as LucideIcons from "lucide-react";
import { X, AlertCircle, Loader2 } from "lucide-react";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setErrorMsg(null);
    setIsSaving(false);
    setIsConfirmingDelete(false);
    setIsDeleting(false);
  }, [editing, open]);

  // 1. FUNCIONALIDADE: Ajusta a categoria padrão ao alternar o tipo da transação (Receita ou Despesa)
  const handleTypeChange = (newType: TxType) => {
    setType(newType);
    if (newType === "income") {
      setCategoryId("salario"); // "Salários" é o padrão para receitas
    } else {
      setCategoryId("alimentacao"); // "Alimentação" é o padrão para despesas
    }
  };

  // Retorna nulo se o painel não estiver configurado para ser exibido (aberto)
  if (!open) return null;

  // Lógica de salvar transação
  const save = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault(); // Evita que o evento de toque/clique se perca se o teclado fechar
    
    // Limpa a string de formatação errada
    const cleanStr = amount.replace(/[^\d.,]/g, "");
    let value = 0;
    if (cleanStr.includes(",")) {
      // Tem vírgula, então o ponto (se houver) é separador de milhar
      value = parseFloat(cleanStr.replace(/\./g, "").replace(",", "."));
    } else {
      value = parseFloat(cleanStr);
    }

    if (!value || value <= 0) {
      setErrorMsg("Por favor, digite um valor válido maior que zero.");
      return;
    }
    setErrorMsg(null);
    
    // Se a descrição estiver vazia, usa o nome da categoria selecionada
    let finalDesc = description.trim();
    if (!finalDesc) {
      const allCats = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
      const selectedCat = allCats.find(c => c.id === categoryId);
      finalDesc = selectedCat ? selectedCat.label : (type === "income" ? "Receita" : "Despesa");
    }

    const payload = { type, description: finalDesc, amount: value, date, categoryId };
    
    // Animação de carregamento (delayzinho tátil)
    setIsSaving(true);
    setTimeout(() => {
      if (editing) updateTx({ ...editing, ...payload });
      else addTx(payload);
      setIsSaving(false);
      onClose();
    }, 400);
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

        {/* Mensagem de Erro Profissional */}
        {errorMsg && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-orange/10 border border-orange/20 text-orange animate-in fade-in zoom-in-95 duration-200">
            <AlertCircle size={18} className="shrink-0" />
            <span className="text-xs font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Alternador de Tipo: Despesa ou Receita */}
        <div className="grid grid-cols-2 p-1 rounded-full bg-navy mb-5 border border-cream/10">
          {(["income", "expense"] as TxType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={
                "py-2.5 rounded-full text-sm font-semibold transition-colors " +
                (type === t ? "bg-orange text-white" : "text-cream-muted")
              }
            >
              {t === "income" ? "Receita" : "Despesa"}
            </button>
          ))}
        </div>

        {/* 2. FUNCIONALIDADE: Campo de entrada para Valor (Corrigido para tamanho padronizado h-11) */}
        <label className="block text-xs text-cream-muted mb-2">Valor</label>
        <div className="flex items-center gap-2 mb-5 px-4 h-11 rounded-xl bg-navy border border-cream/20">
          <span className="text-cream-muted text-sm font-semibold">R$</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="bg-transparent outline-none text-cream text-sm font-semibold w-full"
          />
        </div>

        {/* 4. FUNCIONALIDADE: Campo de entrada para Descrição (Corrigido para tamanho padronizado h-11) */}
        <label className="block text-xs text-cream-muted mb-2">Descrição</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Almoço"
          className="w-full mb-4 px-4 h-11 rounded-xl bg-navy border border-cream/20 text-cream outline-none text-sm"
        />

        {/* 5. FUNCIONALIDADE: Campo de entrada para Data com tamanho padronizado e legível no celular */}
        <label className="block text-xs text-cream-muted mb-2">Data</label>
        <div className="flex items-center gap-2 mb-5 px-4 h-11 rounded-xl bg-navy border border-cream/20">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent outline-none text-cream text-sm w-full h-full"
          />
        </div>

        {/* 3. FUNCIONALIDADE: Seleção dinâmica de Categorias baseada no Tipo (Receita / Despesa) */}
        <label className="block text-xs text-cream-muted mb-2">Categoria</label>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => {
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
          onPointerDown={!isSaving ? save : undefined} // Dispara antes do teclado fechar no celular, evitando cancelamento de clique
          onClick={!isSaving ? save : undefined} // Fallback para desktop
          disabled={isSaving}
          className="w-full py-3.5 rounded-xl bg-orange text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-70 transition-opacity"
        >
          {isSaving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar"
          )}
        </button>

        {/* Botão de Excluir (exibido apenas se estiver em modo de edição) */}
        {editing && (
          <div className="mt-2">
            {!isConfirmingDelete ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isSaving}
                className="w-full py-3 rounded-xl border border-orange/40 text-orange font-semibold disabled:opacity-50 transition-opacity"
              >
                Excluir
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl border border-cream/20 text-cream-muted font-semibold disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleting(true);
                    setTimeout(() => {
                      deleteTx(editing.id);
                      setIsDeleting(false);
                      onClose();
                    }, 400);
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl bg-orange/20 border border-orange text-orange font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    "Confirmar"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
