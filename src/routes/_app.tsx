import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";

// Criação da rota do layout '_app' (rota pai para páginas autenticadas)
export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

/**
 * Componente AppLayout.
 * Layout base para todas as sub-rotas autenticadas.
 * Aguarda a verificação de sessão do Supabase antes de redirecionar.
 */
function AppLayout() {
  // 1. FUNCIONALIDADE: initializing indica que o Supabase ainda está verificando a sessão
  const { isAuthed, initializing } = useStore();
  const navigate = useNavigate();

  // 2. FUNCIONALIDADE: Redireciona para login apenas após a sessão ser verificada
  useEffect(() => {
    if (!initializing && !isAuthed) {
      navigate({ to: "/" });
    }
  }, [isAuthed, initializing, navigate]);

  // 3. FUNCIONALIDADE: Exibe spinner enquanto a sessão do Supabase é carregada
  if (initializing) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <Loader2 size={28} className="text-orange animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy">
      {/* O componente Outlet renderiza a rota filha ativa */}
      <Outlet />
    </div>
  );
}
