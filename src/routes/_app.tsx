import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

// Criação da rota do layout '_app' (rota pai/layout para páginas logadas)
export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

/**
 * Componente AppLayout.
 * Serve como layout base para todas as subrotas autenticadas da aplicação.
 * Garante que usuários não autenticados sejam redirecionados de volta para a tela de login.
 */
function AppLayout() {
  const { isAuthed } = useStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Aguarda um pequeno intervalo (tick) para hidratar o LocalStorage antes de disparar o redirecionamento
    const t = setTimeout(() => {
      if (!isAuthed && typeof window !== "undefined" && localStorage.getItem("fintrack.auth") !== "true") {
        navigate({ to: "/" });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [isAuthed, navigate]);

  return (
    <div className="min-h-screen bg-navy">
      {/* O componente Outlet renderiza a rota filha ativa */}
      <Outlet />
    </div>
  );
}
