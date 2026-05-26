import * as React from "react";

// Largura em pixels que define o limite para telas móveis
const MOBILE_BREAKPOINT = 768;

/**
 * Hook customizado para verificar se o dispositivo atual é um dispositivo móvel (tela menor que 768px).
 * Utiliza o matchMedia do navegador para ouvir mudanças de redimensionamento de forma eficiente.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Monitora a media query correspondente ao limite de tela móvel
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    // Adiciona escuta para alterações de largura da janela
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    // Remove o ouvinte de evento ao desmontar o componente
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
