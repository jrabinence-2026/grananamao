import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Target, Bell, Palette, Coins, Lock, LogOut } from "lucide-react";
import { useStore } from "@/lib/store";

// Lista das opções de configuração exibidas no perfil do usuário
const rows = [
  { label: "Meta mensal", icon: Target, to: "/goals" as const },
  { label: "Notificações", icon: Bell },
  { label: "Tema", icon: Palette },
  { label: "Moeda", icon: Coins },
  { label: "Alterar senha", icon: Lock },
];

/**
 * Componente ProfilePage (Perfil do Usuário).
 * Apresenta informações básicas de perfil (Avatar com iniciais, Nome, E-mail)
 * e uma lista com opções de ajustes, além do botão de "Sair" (Logout).
 */
export function ProfilePage() {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  
  // Extrai as iniciais do nome do usuário para exibir como avatar (mock)
  const initials = (user?.name ?? "J").slice(0, 2).toUpperCase();

  return (
    <div className="bg-navy min-h-screen">
      {/* Cabeçalho de Perfil com Avatar */}
      <header className="px-4 pt-12 pb-6 text-center">
        <div
          className="h-20 w-20 rounded-full mx-auto bg-navy-elevated flex items-center justify-center border-2 border-orange"
        >
          <span className="text-cream font-bold text-xl">{initials}</span>
        </div>
        <h1 className="mt-3 text-lg font-bold text-cream">{user?.name ?? "João"}</h1>
        <p className="text-xs text-cream-muted">{user?.email ?? "joao@fintrack.app"}</p>
      </header>

      {/* Opções de Configuração */}
      <div className="px-4">
        <ul className="rounded-2xl bg-navy-elevated divide-y divide-cream/5 border border-cream/5">
          {rows.map((r) => {
            const Icon = r.icon;
            const content = (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <Icon size={18} className="text-cream-muted" />
                <span className="flex-1 text-sm text-cream">{r.label}</span>
                <ChevronRight size={16} className="text-cream-muted" />
              </div>
            );
            return (
              <li key={r.label}>
                {/* Se a opção possui link, renderiza o Link do TanStack Router, caso contrário é apenas um botão */}
                {r.to ? <Link to={r.to}>{content}</Link> : <button className="w-full text-left">{content}</button>}
              </li>
            );
          })}
        </ul>

        {/* Botão de Logout para desautenticar o usuário e voltar para o Login */}
        <button
          onClick={() => { logout(); navigate({ to: "/" }); }}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-navy-elevated border border-orange/30 text-orange font-semibold"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </div>
  );
}
