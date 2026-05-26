// Captura o Erro original fora da banda normal (out-of-band) para que o server.ts consiga
// recuperar a pilha de erros (stack trace) quando o h3 já tiver engolido a exceção em uma Resposta 500 genérica.

// Armazena temporariamente o último erro capturado e o momento em que ocorreu
let lastCapturedError: { error: unknown; at: number } | undefined;
// Tempo de vida útil do erro capturado em milissegundos (5 segundos)
const TTL_MS = 5_000;

// Registra o erro recebido atualizando a variável global local com o timestamp atual
function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

// Se estiver em um ambiente que suporta EventListeners globais, escuta erros não tratados e rejeições de promessas
if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

/**
 * Consome e retorna o último erro capturado, se ele ainda estiver dentro do tempo de validade (TTL).
 * Limpa o erro capturado após o consumo para evitar vazamento ou reutilização de erros antigos.
 */
export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  // Verifica se o erro já expirou
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined; // Reseta após consumir
  return error;
}
