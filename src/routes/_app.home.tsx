import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HomePage as HomeView } from "@/pages/HomePage";
import { TransactionsPage as TransactionsView } from "@/pages/TransactionsPage";
import { ChartsPage as ChartsView } from "@/pages/ChartsPage";
import { GoalsPage as GoalsView } from "@/pages/GoalsPage";
import { ProfilePage as ProfileView } from "@/pages/ProfilePage";
import { BottomNav } from "@/components/BottomNav";

// Registra a rota '/_app/home' no TanStack Router
export const Route = createFileRoute("/_app/home")({
  component: DashboardWrapper,
});

/**
 * Componente DashboardWrapper.
 * Centraliza a navegação de abas no lado do cliente por meio do estado do React (activeTab),
 * enquanto as páginas reais continuam separadas em arquivos modulares na pasta `src/pages/`.
 */
function DashboardWrapper() {
  const [activeTab, setActiveTab] = useState<string>("home");

  return (
    <div className="min-h-screen pb-24 bg-navy">
      {/* Renderiza dinamicamente a página correspondente à aba ativa */}
      {activeTab === "home" && <HomeView />}
      {activeTab === "transactions" && <TransactionsView />}
      {activeTab === "charts" && <ChartsView />}
      {activeTab === "goals" && <GoalsView />}
      {activeTab === "profile" && <ProfileView />}

      {/* Barra de navegação inferior controlada */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}
