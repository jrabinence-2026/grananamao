import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Goal, Transaction } from "./types";

// Chaves para persistência de dados no LocalStorage
const TX_KEY = "fintrack.transactions";
const GOAL_KEY = "fintrack.goals";
const AUTH_KEY = "fintrack.auth";
const USER_KEY = "fintrack.user";

// Interface descrevendo o formato do nosso estado global (Store)
interface Store {
  transactions: Transaction[];
  goals: Goal[];
  addTx: (t: Omit<Transaction, "id">) => void;
  updateTx: (t: Transaction) => void;
  deleteTx: (id: string) => void;
  addGoal: (g: Omit<Goal, "id">) => void;
  user: { name: string; email: string } | null;
  isAuthed: boolean;
  login: (email: string) => void;
  logout: () => void;
}

// Criação do contexto do React para compartilhamento global de estado
const Ctx = createContext<Store | null>(null);

/**
 * Função geradora de dados iniciais (seed) para transações caso o LocalStorage esteja vazio.
 */
const seed = (): Transaction[] => {
  const today = new Date();
  const d = (offset: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() - offset);
    return x.toISOString().slice(0, 10);
  };
  return [
    { id: "1", type: "income", description: "Salário Maio", amount: 5400, date: d(1), categoryId: "salario" },
    { id: "2", type: "expense", description: "Supermercado", amount: 320.5, date: d(1), categoryId: "alimentacao" },
    { id: "3", type: "expense", description: "Uber", amount: 28.9, date: d(2), categoryId: "transporte" },
    { id: "4", type: "expense", description: "Aluguel", amount: 1800, date: d(3), categoryId: "moradia" },
    { id: "5", type: "expense", description: "Cinema", amount: 65, date: d(4), categoryId: "lazer" },
    { id: "6", type: "expense", description: "Farmácia", amount: 89.7, date: d(5), categoryId: "saude" },
    { id: "7", type: "expense", description: "Restaurante", amount: 142, date: d(6), categoryId: "alimentacao" },
  ];
};

/**
 * Função geradora de metas iniciais (seed) para metas financeiras.
 */
const seedGoals = (): Goal[] => [
  { id: "g1", name: "Viagem Europa", target: 12000, current: 4200 },
  { id: "g2", name: "Reserva de emergência", target: 20000, current: 13500 },
  { id: "g3", name: "Notebook novo", target: 8000, current: 1800 },
];

/**
 * Utilitário para carregar dados do LocalStorage de forma segura com fallback de erro.
 */
function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Provedor do Contexto da aplicação, responsável por gerenciar a lógica de transações, metas e autenticação.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [user, setUser] = useState<Store["user"]>(null);
  const [isAuthed, setAuthed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Inicializa o estado com dados do LocalStorage ou sementes de mock
  useEffect(() => {
    setTransactions(load(TX_KEY, seed()));
    setGoals(load(GOAL_KEY, seedGoals()));
    setAuthed(load(AUTH_KEY, false));
    setUser(load(USER_KEY, { name: "João", email: "joao@fintrack.app" }));
    setHydrated(true);
  }, []);

  // Salva transações no LocalStorage toda vez que forem alteradas
  useEffect(() => {
    if (hydrated) localStorage.setItem(TX_KEY, JSON.stringify(transactions));
  }, [transactions, hydrated]);

  // Salva metas no LocalStorage toda vez que forem alteradas
  useEffect(() => {
    if (hydrated) localStorage.setItem(GOAL_KEY, JSON.stringify(goals));
  }, [goals, hydrated]);

  // Memoriza o valor do contexto para evitar renderizações desnecessárias
  const value: Store = useMemo(
    () => ({
      transactions,
      goals,
      user,
      isAuthed,
      // Adiciona uma nova transação gerando um UUID único
      addTx: (t) => setTransactions((arr) => [{ ...t, id: crypto.randomUUID() }, ...arr]),
      // Atualiza uma transação existente substituindo pelo id correspondente
      updateTx: (t) => setTransactions((arr) => arr.map((x) => (x.id === t.id ? t : x))),
      // Remove uma transação específica pelo id
      deleteTx: (id) => setTransactions((arr) => arr.filter((x) => x.id !== id)),
      // Adiciona uma nova meta financeira gerando um UUID único
      addGoal: (g) => setGoals((arr) => [...arr, { ...g, id: crypto.randomUUID() }]),
      // Realiza login definindo informações do usuário baseadas no e-mail
      login: (email) => {
        const name = email.split("@")[0] || "João";
        const u = { name: name.charAt(0).toUpperCase() + name.slice(1), email };
        setUser(u);
        setAuthed(true);
        localStorage.setItem(AUTH_KEY, "true");
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      },
      // Realiza logout e limpa estado de autenticação
      logout: () => {
        setAuthed(false);
        localStorage.setItem(AUTH_KEY, "false");
      },
    }),
    [transactions, goals, user, isAuthed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Hook para acessar facilmente o estado da Store em qualquer lugar da árvore de componentes.
 */
export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fora do provider");
  return s;
}

/**
 * Formata um número para o padrão de moeda Brasileira (BRL / R$).
 */
export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
