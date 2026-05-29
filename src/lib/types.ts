// Tipo de transação financeira: entrada (income) ou saída (expense)
export type TxType = "income" | "expense";

// Estrutura para uma categoria de despesa/receita
export interface Category {
  id: string;
  label: string;
  color: string;
  icon: string; // Nome do ícone da biblioteca Lucide
}

// Estrutura para uma transação financeira individual
export interface Transaction {
  id: string;
  type: TxType;
  description: string;
  amount: number;
  date: string; // Formato de data ISO yyyy-mm-dd
  categoryId: string;
}

// Estrutura para uma meta financeira pessoal
export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
}

// Lista estática de categorias padrão para Despesas (Saídas)
export const EXPENSE_CATEGORIES: Category[] = [
  { id: "alimentacao", label: "Alimentação", color: "#FF8A4C", icon: "Utensils" },
  { id: "moradia", label: "Moradia", color: "#7BB4E8", icon: "Home" },
  { id: "transporte", label: "Transporte", color: "#F2C94C", icon: "Car" },
  { id: "saude", label: "Saúde", color: "#56C271", icon: "HeartPulse" },
  { id: "lazer", label: "Lazer", color: "#C490E4", icon: "Gamepad2" },
  { id: "outros", label: "Outros", color: "#EDDABA", icon: "MoreHorizontal" },
];

// 1. FUNCIONALIDADE: Lista estática de categorias padrão para Receitas (Entradas)
export const INCOME_CATEGORIES: Category[] = [
  { id: "vale_alimentacao", label: "Vale alimentação", color: "#FF8A4C", icon: "ShoppingBag" },
  { id: "salario", label: "Salário", color: "#4CAF50", icon: "Wallet" },
  { id: "extra", label: "Extra", color: "#56C271", icon: "Coins" },
  { id: "bets", label: "Bets", color: "#FF5404", icon: "Dices" },
  { id: "freelancer", label: "Freelancer", color: "#7BB4E8", icon: "Laptop" },
  { id: "outros", label: "Outros", color: "#EDDABA", icon: "MoreHorizontal" },
];

// 2. FUNCIONALIDADE: União dinâmica das categorias para garantir o correto funcionamento dos utilitários
export const CATEGORIES: Category[] = [];
const seenIds = new Set<string>();

[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].forEach((c) => {
  if (!seenIds.has(c.id)) {
    seenIds.add(c.id);
    CATEGORIES.push(c);
  }
});

/**
 * Utilitário para buscar uma categoria pelo ID correspondente.
 * Retorna a categoria 'Outros' se nenhuma categoria específica for encontrada.
 */
export const categoryById = (id: string) =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

