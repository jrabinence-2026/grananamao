import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { HomePage as HomeView } from "@/pages/HomePage";
import { TransactionsPage as TransactionsView } from "@/pages/TransactionsPage";
import { ChartsPage as ChartsView } from "@/pages/ChartsPage";
import { GoalsPage as GoalsView } from "@/pages/GoalsPage";
import { ProfilePage as ProfileView } from "@/pages/ProfilePage";
import { BottomNav } from "@/components/BottomNav";
import { useStore } from "@/lib/store";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

// Schema de validação dos parâmetros de busca
const homeSearchSchema = z.object({
  tab: z.enum(["home", "transactions", "charts", "goals", "profile"]).optional().catch("home"),
});

// Registra a rota '/_app/home' no TanStack Router com suporte a validação de parâmetros
export const Route = createFileRoute("/_app/home")({
  validateSearch: (search) => homeSearchSchema.parse(search),
  component: DashboardWrapper,
});

/**
 * Componente DashboardWrapper.
 * Centraliza a navegação de abas no lado do cliente por meio do estado do React (activeTab),
 * enquanto as páginas reais continuam separadas em arquivos modulares na pasta `src/pages/`.
 */
function DashboardWrapper() {
  const { user } = useStore();
  // 1. FUNCIONALIDADE: Obtém a aba ativa diretamente do parâmetro de busca da URL
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  
  // Se o usuário tem o telefone temporário do Google, força a aba "profile"
  const isNewGoogleUser = user && user.phone && user.phone.startsWith("000000000");
  const activeTab = isNewGoogleUser ? "profile" : (tab || "home");

  // 2. FUNCIONALIDADE: Atualiza o parâmetro de busca da URL ao trocar de aba
  const setActiveTab = (newTab: "home" | "transactions" | "charts" | "goals" | "profile") => {
    navigate({
      search: (prev) => ({ ...prev, tab: newTab }),
    });
  };

  return (
    <div className="min-h-screen pb-24 bg-navy">
      {/* Renderiza dinamicamente a página correspondente à aba ativa */}
      {activeTab === "home" && <HomeView />}
      {activeTab === "transactions" && <TransactionsView />}
      {activeTab === "charts" && <ChartsView />}
      {activeTab === "goals" && <GoalsView />}
      {activeTab === "profile" && <ProfileView />}

      {/* Barra de navegação inferior controlada */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab as any} />

      {/* Prompt de Instalação PWA */}
      <PWAInstallPrompt />
    </div>
  );
}
