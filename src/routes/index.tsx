import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/pages/LoginPage";

// Criação da rota inicial ("/") com o componente LoginPage importado
export const Route = createFileRoute("/")({
  component: LoginPage,
});
