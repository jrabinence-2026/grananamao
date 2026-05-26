import { Home, ArrowLeftRight, PieChart, User } from "lucide-react";

// Lista de abas de navegação com ID, rótulo e ícone Lucide correspondente
const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "transactions", label: "Lançamentos", icon: ArrowLeftRight },
  { id: "charts", label: "Gráficos", icon: PieChart },
  { id: "profile", label: "Perfil", icon: User },
] as const;

interface BottomNavProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
}

/**
 * Componente BottomNav (Barra de Navegação Inferior).
 * Controlado por estado para facilitar a troca de abas em uma única página.
 */
export function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-navy border-t z-40"
      style={{ borderColor: "rgba(237,218,186,0.12)" }}
    >
      <div className="grid grid-cols-4 px-2 pt-2 pb-3">
        {tabs.map((t) => {
          const active = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => onChangeTab(t.id)}
              className="flex flex-col items-center gap-1 py-1.5 cursor-pointer w-full text-center"
            >
              {/* Ícone com estilo dinâmico para destacar a aba ativa */}
              <Icon
                size={22}
                className={active ? "text-orange" : "text-cream-muted"}
                strokeWidth={active ? 2.4 : 1.8}
              />
              {/* Rótulo de texto com col dinâmica baseada na rota ativa */}
              <span
                className={
                  "text-[10px] " +
                  (active ? "text-orange font-semibold" : "text-cream-muted")
                }
              >
                {t.label}
              </span>
              {/* Indicador de ponto pequeno inferior para o link ativo */}
              <span
                className={
                  "h-1 w-1 rounded-full " + (active ? "bg-orange" : "bg-transparent")
                }
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
