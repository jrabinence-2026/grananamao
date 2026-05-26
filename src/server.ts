import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// Definição de tipo para o ponto de entrada (entrypoint) do servidor do TanStack
type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

// Promessa para importar dinamicamente e armazenar o ponto de entrada do servidor
let serverEntryPromise: Promise<ServerEntry> | undefined;

/**
 * Obtém ou importa dinamicamente o ponto de entrada do servidor do TanStack Start.
 */
async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

/**
 * Cria uma resposta HTTP 500 renderizando a página de erro personalizada.
 */
function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/**
 * Verifica se a resposta de erro recebida possui o formato de um erro catastrófico não tratado do Vinxi/h3.
 */
function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

/**
 * O framework Vinxi (h3) captura exceções do manipulador de requisições e as transforma em uma Resposta 500
 * genérica contendo o corpo {"unhandled":true,"message":"HTTPError"}. Esta função identifica isso e
 * normaliza a resposta exibindo a nossa página de erro estilizada e registrando o erro real no console.
 */
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  // Registra no console o erro original consumido de forma assíncrona
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

// Exporta o manipulador de requisições fetch principal que roda no servidor (ex: Cloudflare Workers, Node.js)
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
