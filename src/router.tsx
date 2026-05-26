import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Função para instanciar e retornar a configuração do roteador da aplicação (TanStack Router).
 * Cria um novo `QueryClient` de forma que cada requisição (especialmente no SSR) tenha sua própria instância limpa.
 */
export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree, // A árvore de rotas autogerada em routeTree.gen.ts
    context: { queryClient }, // Injeta o QueryClient no contexto global do roteador
    scrollRestoration: true, // Restaura a posição da barra de rolagem ao navegar entre páginas
    defaultPreloadStaleTime: 0, // Desativa o cache padrão para pré-carregamentos de rota obsoletos
  });

  return router;
};
