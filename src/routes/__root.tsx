import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { StoreProvider } from "@/lib/store";

// Importação da URL do arquivo de estilos globais CSS da aplicação
import appCss from "../styles.css?url";

/**
 * Componente exibido quando a rota requisitada não existe (Erro 404).
 */
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-cream">404</h1>
        <p className="mt-2 text-sm text-cream-muted">Página não encontrada.</p>
        <a href="/" className="mt-6 inline-flex rounded-xl bg-orange px-4 py-2 text-white font-semibold">
          Voltar
        </a>
      </div>
    </div>
  );
}

/**
 * Componente de Fallback de Erro exibido caso ocorra alguma falha crítica de execução na renderização de rotas.
 */
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-cream">Algo deu errado</h1>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-xl bg-orange px-4 py-2 text-white font-semibold"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

/**
 * Configuração da Rota Raiz (Root Route) com o contexto de QueryClient injetado pelo roteador.
 */
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Cabeçalho HTML com metadados SEO, tags Open Graph para redes sociais e ícones/fontes externas
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" },
      { name: "theme-color", content: "#091A25" },
      { title: "GranaNaMao — Suas finanças, simples" },
      { name: "description", content: "GranaNaMao: gerencie receitas, despesas e metas financeiras com simplicidade." },
      { property: "og:title", content: "GranaNaMao — Suas finanças, simples" },
      { name: "twitter:title", content: "GranaNaMao — Suas finanças, simples" },
      { property: "og:description", content: "GranaNaMao: gerencie receitas, despesas e metas financeiras com simplicidade." },
      { name: "twitter:description", content: "GranaNaMao: gerencie receitas, despesas e metas financeiras com simplicidade." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/badf4cac-5623-4312-b279-e33f9461aafd/id-preview-23a46416--24cc0cf7-4acf-416e-820b-6863422508fd.lovable.app-1779824238135.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/badf4cac-5623-4312-b279-e33f9461aafd/id-preview-23a46416--24cc0cf7-4acf-416e-820b-6863422508fd.lovable.app-1779824238135.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "icon", href: "/img/pwalogo.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/img/pwalogo.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/**
 * Shell raiz de renderização do HTML estrutural no servidor.
 */
function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, BellRing, Loader2 } from "lucide-react";

function AppContent() {
  const { user, logout, loading } = useStore();
  
  if (user?.is_blocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-navy px-4 text-center animate-fade-in">
        <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <span className="text-red-500 text-3xl">🚫</span>
        </div>
        <h1 className="text-2xl font-bold text-cream mb-2">Conta Suspensa</h1>
        <p className="text-cream-muted text-sm max-w-xs mx-auto mb-8">
          O acesso a esta conta foi temporariamente bloqueado por um administrador.
        </p>
        <button 
          onClick={() => logout()}
          disabled={loading}
          className="px-6 py-3 bg-navy-elevated border border-cream/10 rounded-xl text-cream font-semibold hover:bg-cream/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Saindo..." : "Sair da Conta"}
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell relative">
      <Outlet />
    </div>
  );
}

/**
 * Componente principal envolto pelos provedores globais do React Query e da Store local.
 */
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </QueryClientProvider>
  );
}

