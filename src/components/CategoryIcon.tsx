import * as LucideIcons from "lucide-react";
import { categoryById } from "@/lib/types";

// Mapeia todas as exportações da biblioteca Lucide como um record chave-valor de componentes LucideIcon
type IconMap = Record<string, LucideIcons.LucideIcon>;
const Icons = LucideIcons as unknown as IconMap;

/**
 * Componente CategoryIcon.
 * Renderiza dinamicamente um ícone Lucide com base no ID da categoria fornecido.
 * Define a cor de fundo e a cor do ícone de acordo com o esquema de cores cadastrado da categoria.
 */
export function CategoryIcon({ id, size = 18 }: { id: string; size?: number }) {
  // Obtém os metadados da categoria correspondente (como cor e nome do ícone)
  const c = categoryById(id);
  // Resolve o componente do ícone dinamicamente, usando Icons.Circle como fallback caso não encontre
  const Icon = Icons[c.icon] ?? Icons.Circle;
  return (
    <span
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        // Define uma cor de fundo transparente usando o canal alfa hexadecimal ("22") anexado ao código de cor
        backgroundColor: c.color + "22",
        color: c.color,
        height: size + 18,
        width: size + 18,
      }}
    >
      <Icon size={size} />
    </span>
  );
}
