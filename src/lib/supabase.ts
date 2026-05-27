import { createClient } from "@supabase/supabase-js";

// 1. FUNCIONALIDADE: Lê as credenciais do Supabase das variáveis de ambiente injetadas pelo Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// 2. FUNCIONALIDADE: Cria e exporta o cliente Supabase como singleton para toda a aplicação
export const supabase = createClient(supabaseUrl, supabaseKey);
