import { useState, useEffect } from "react";
import { X, Download, Share, Plus, Smartphone, Chrome, Info, CheckCircle2, ChevronRight } from "lucide-react";

// Função para detectar se está rodando no modo Standalone (PWA Instalado)
const isStandalone = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    window.location.search.includes("mode=standalone")
  );
};

// Função para detectar o SO
const getPlatform = () => {
  if (typeof window === "undefined") return "desktop";
  const ua = window.navigator.userAgent.toLowerCase();
  if (/ipad|iphone|ipod/.test(ua) && !(window as any).MSStream) {
    return "ios";
  }
  if (/android/.test(ua)) {
    return "android";
  }
  return "desktop";
};

interface PWAInstallPromptProps {
  forceOpen?: boolean;
  onCloseForceOpen?: () => void;
}

export function PWAInstallPrompt({ forceOpen = false, onCloseForceOpen }: PWAInstallPromptProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    if (isStandalone()) return;

    // Detecta plataforma
    setPlatform(getPlatform());

    // Se forceOpen estiver ativo, abre direto o tutorial
    if (forceOpen) {
      setShowTutorial(true);
      return;
    }

    let timer: NodeJS.Timeout;

    const checkAndShow = () => {
      const dismissTimeStr = localStorage.getItem("fintrack_pwa_dismiss_time");
      if (dismissTimeStr) {
        const dismissTime = parseInt(dismissTimeStr, 10);
        const now = new Date().getTime();
        const elapsed = now - dismissTime;
        if (elapsed < 30000) {
          // Se foi fechado há menos de 30 segundos, espera o tempo restante para exibir novamente
          const remaining = 30000 - elapsed;
          timer = setTimeout(() => {
            if (!isStandalone()) setShowBanner(true);
          }, remaining);
          return;
        }
      }
      setShowBanner(true);
    };

    checkAndShow();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [forceOpen]);

  useEffect(() => {
    // Captura o evento nativo de instalação do Chrome/Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Só mostra se não foi descartado recentemente
      const dismissTimeStr = localStorage.getItem("fintrack_pwa_dismiss_time");
      let isDismissedRecent = false;
      if (dismissTimeStr) {
        const dismissTime = parseInt(dismissTimeStr, 10);
        const now = new Date().getTime();
        isDismissedRecent = (now - dismissTime) < 30000;
      }

      if (!isDismissedRecent && !forceOpen) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [forceOpen]);

  // Se já estiver rodando em standalone, não renderiza absolutamente nada
  if (isStandalone()) {
    return null;
  }

  const handleDismiss = () => {
    const dismissTime = new Date().getTime();
    localStorage.setItem("fintrack_pwa_dismiss_time", dismissTime.toString());
    setShowBanner(false);

    // Configura um timer para reexibir em 30 segundos
    setTimeout(() => {
      if (!isStandalone()) {
        setShowBanner(true);
      }
    }, 30000);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Dispara o prompt nativo de instalação (Chrome/Android/Edge)
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowBanner(false);
      }
    } else {
      // Para iOS ou navegadores sem suporte ao prompt automático, abre o tutorial visual
      setShowTutorial(true);
      setShowBanner(false);
    }
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    if (onCloseForceOpen) {
      onCloseForceOpen();
    }
  };

  return (
    <>
      {/* 1. Banner Flutuante de Convite */}
      {showBanner && !showTutorial && (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-md bg-navy-elevated/95 backdrop-blur-md border border-orange/20 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-500">
          <div className="flex gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-orange/10 overflow-hidden flex items-center justify-center border border-orange/10">
              <img src="/img/pwalogo.png" alt="Logo" className="h-7 w-7 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-cream">Instalar no Celular/PC</h3>
                <button onClick={handleDismiss} className="p-1 hover:bg-cream/5 rounded-full text-cream-muted transition-colors">
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-cream-muted mt-1 leading-relaxed">
                Use o GranaNaMão em tela cheia como se fosse um aplicativo nativo. Rápido, sem barras de navegação do browser e offline!
              </p>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-orange to-[#FF7043] text-white font-bold text-xs rounded-xl shadow-md shadow-orange/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  Instalar Agora
                </button>
                <button
                  onClick={() => setShowTutorial(true)}
                  className="py-2 px-3 bg-navy border border-cream/10 text-cream font-bold text-xs rounded-xl hover:bg-cream/5 active:scale-95 transition-all"
                >
                  Como fazer?
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal do Tutorial Passo a Passo */}
      {showTutorial && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-navy/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div 
            className="w-full max-w-md bg-navy-elevated border border-cream/10 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between pb-3 border-b border-cream/5">
              <div className="flex items-center gap-2">
                <Smartphone className="text-orange" size={20} />
                <h2 className="text-base font-bold text-cream">Tutorial de Instalação</h2>
              </div>
              <button 
                onClick={handleCloseTutorial}
                className="p-2 bg-navy rounded-full border border-cream/10 text-cream-muted hover:text-cream transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              <div className="p-3 bg-orange/5 border border-orange/10 rounded-2xl flex items-start gap-2.5">
                <Info size={16} className="text-orange shrink-0 mt-0.5" />
                <p className="text-[11px] text-cream-muted leading-relaxed">
                  O GranaNaMão é um aplicativo progressivo (PWA). Você pode adicioná-lo à sua tela de início sem precisar da App Store ou Google Play Store.
                </p>
              </div>

              {/* Seletor de Guias Rápido */}
              <div className="flex bg-navy p-1 rounded-xl border border-cream/5">
                <button
                  onClick={() => setPlatform("ios")}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    platform === "ios" ? "bg-navy-elevated text-orange border border-cream/5" : "text-cream-muted"
                  }`}
                >
                  iPhone / iOS
                </button>
                <button
                  onClick={() => setPlatform("android")}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    platform === "android" ? "bg-navy-elevated text-orange border border-cream/5" : "text-cream-muted"
                  }`}
                >
                  Android
                </button>
                <button
                  onClick={() => setPlatform("desktop")}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    platform === "desktop" ? "bg-navy-elevated text-orange border border-cream/5" : "text-cream-muted"
                  }`}
                >
                  Computador (PC)
                </button>
              </div>

              {/* Guia iOS */}
              {platform === "ios" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-orange/10 border border-orange/20 text-orange font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <div className="text-xs">
                      <p className="text-cream font-bold">Abra no Safari</p>
                      <p className="text-cream-muted mt-1 leading-relaxed">
                        Este tutorial só funciona no navegador **Safari** oficial do iPhone. Abra a página lá.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-orange/10 border border-orange/20 text-orange font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <div className="text-xs">
                      <p className="text-cream font-bold flex items-center gap-1">
                        Toque em Compartilhar <Share size={14} className="text-[#007AFF]" />
                      </p>
                      <p className="text-cream-muted mt-1 leading-relaxed">
                        No menu de navegação inferior do Safari, toque no botão de compartilhar (o ícone de quadrado com uma seta para cima).
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-orange/10 border border-orange/20 text-orange font-bold text-xs flex items-center justify-center shrink-0">3</span>
                    <div className="text-xs">
                      <p className="text-cream font-bold flex items-center gap-1">
                        Selecione "Adicionar à Tela de Início" <Plus size={14} className="text-cream" />
                      </p>
                      <p className="text-cream-muted mt-1 leading-relaxed">
                        Role a lista de opções para baixo e toque em **"Adicionar à Tela de Início"**.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-orange/10 border border-orange/20 text-orange font-bold text-xs flex items-center justify-center shrink-0">4</span>
                    <div className="text-xs">
                      <p className="text-cream font-bold">Confirme tocando em "Adicionar"</p>
                      <p className="text-cream-muted mt-1 leading-relaxed">
                        Toque no botão **"Adicionar"** no canto superior direito para finalizar. O aplicativo aparecerá na sua tela de apps inicial!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Guia Android */}
              {platform === "android" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {deferredPrompt ? (
                    <div className="bg-navy p-4 border border-cream/5 rounded-2xl text-center space-y-3">
                      <Chrome className="text-orange mx-auto animate-bounce" size={28} />
                      <p className="text-xs text-cream font-medium">Instalação direta disponível!</p>
                      <p className="text-[11px] text-cream-muted">Seu navegador suporta a instalação rápida automática.</p>
                      <button
                        onClick={handleInstallClick}
                        className="w-full py-2 px-4 bg-orange text-white font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={14} /> Instalar com um toque
                      </button>
                    </div>
                  ) : null}

                  <div className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-orange/10 border border-orange/20 text-orange font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <div className="text-xs">
                      <p className="text-cream font-bold">Use o Google Chrome</p>
                      <p className="text-cream-muted mt-1 leading-relaxed">
                        Recomendamos o **Google Chrome** no Android para obter a melhor experiência PWA.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-orange/10 border border-orange/20 text-orange font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <div className="text-xs">
                      <p className="text-cream font-bold flex items-center gap-1">
                        Abra o Menu do Chrome
                      </p>
                      <p className="text-cream-muted mt-1 leading-relaxed">
                        Toque no ícone de três pontos verticais no canto superior direito do navegador.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-orange/10 border border-orange/20 text-orange font-bold text-xs flex items-center justify-center shrink-0">3</span>
                    <div className="text-xs">
                      <p className="text-cream font-bold">Toque em "Instalar aplicativo" ou "Adicionar"</p>
                      <p className="text-cream-muted mt-1 leading-relaxed">
                        Selecione a opção **"Instalar aplicativo"** ou **"Adicionar à tela inicial"** no menu.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-orange/10 border border-orange/20 text-orange font-bold text-xs flex items-center justify-center shrink-0">4</span>
                    <div className="text-xs">
                      <p className="text-cream font-bold">Confirme e use</p>
                      <p className="text-cream-muted mt-1 leading-relaxed">
                        Confirme na caixa de diálogo do sistema e o GranaNaMão estará pronto como aplicativo nativo!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Guia Desktop */}
              {platform === "desktop" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {deferredPrompt ? (
                    <div className="bg-navy p-4 border border-cream/5 rounded-2xl text-center space-y-3">
                      <p className="text-xs text-cream font-medium">Instalação rápida disponível!</p>
                      <button
                        onClick={handleInstallClick}
                        className="w-full py-2 px-4 bg-orange text-white font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={14} /> Instalar Aplicativo no PC
                      </button>
                    </div>
                  ) : null}

                  <div className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-orange/10 border border-orange/20 text-orange font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <div className="text-xs">
                      <p className="text-cream font-bold">Ícone da barra de endereço</p>
                      <p className="text-cream-muted mt-1 leading-relaxed">
                        No Chrome ou Edge, clique no ícone de instalação (um computador com uma seta para baixo ou um sinal de +) localizado na extrema direita da barra de endereços do seu navegador.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-orange/10 border border-orange/20 text-orange font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <div className="text-xs">
                      <p className="text-cream font-bold">Ou pelo menu do navegador</p>
                      <p className="text-cream-muted mt-1 leading-relaxed">
                        Clique nos três pontinhos no canto superior direito e selecione **"Instalar GranaNaMão"**.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-orange/10 border border-orange/20 text-orange font-bold text-xs flex items-center justify-center shrink-0">3</span>
                    <div className="text-xs">
                      <p className="text-cream font-bold">Pronto!</p>
                      <p className="text-cream-muted mt-1 leading-relaxed">
                        Um atalho será gerado na área de trabalho e ele abrirá em janela própria sem o navegador.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Tutorial */}
            <div className="pt-3 border-t border-cream/5 flex justify-end">
              <button
                onClick={handleCloseTutorial}
                className="py-2 px-5 bg-navy rounded-xl border border-cream/10 text-cream font-bold text-xs hover:bg-cream/5 active:scale-95 transition-all"
              >
                Entendi, Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
