import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

// Middleware do servidor para capturar exceções durante o processamento de rotas/APIs no lado do servidor
const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // Se o erro for uma resposta estruturada de redirect/status HTTP do TanStack, repassa adiante
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    // Retorna a nossa página de erro estilizada
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Inicialização da instância do Start com o middleware global de tratamento de erros registrado
export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
