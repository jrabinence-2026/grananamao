import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

/**
 * Componente LoginPage.
 * Página de login simples e inicial do aplicativo.
 * Se o usuário já estiver autenticado, redireciona-o automaticamente para a dashboard /home.
 */
export function LoginPage() {
  const { login, isAuthed } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("joao@fintrack.app");
  const [password, setPassword] = useState("");

  // Redireciona o usuário para /home caso detecte estado autenticado
  useEffect(() => {
    if (isAuthed) navigate({ to: "/home" });
  }, [isAuthed, navigate]);

  // Manipulador de envio de formulário para login
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    login(email);
    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-20 pb-10 bg-navy">
      {/* Logotipo e título */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="h-16 w-16 rounded-2xl bg-orange flex items-center justify-center mb-5">
          <span className="text-white font-extrabold text-2xl">F</span>
        </div>
        <h1 className="text-4xl font-extrabold text-cream tracking-tight">FinTrack</h1>
        <p className="mt-2 text-sm text-cream-muted">Controle financeiro, simples e direto.</p>
      </div>

      {/* Formulário de autenticação */}
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-cream-muted mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-4 py-3.5 rounded-xl bg-navy border border-cream/40 text-cream outline-none focus:border-orange"
          />
        </div>
        <div>
          <label className="block text-xs text-cream-muted mb-1.5">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3.5 rounded-xl bg-navy border border-cream/40 text-cream outline-none focus:border-orange"
          />
        </div>

        {/* Botão para logar */}
        <button
          type="submit"
          className="w-full mt-2 py-3.5 rounded-xl bg-orange text-white font-semibold"
        >
          Entrar
        </button>
        
        {/* Botão de cadastro rápido (mocked login) */}
        <button
          type="button"
          onClick={() => login(email || "novo@fintrack.app")}
          className="w-full py-3.5 rounded-xl border border-cream/50 text-cream font-semibold"
        >
          Criar conta
        </button>

        <div className="text-center pt-2">
          <button type="button" className="text-sm text-cream-muted">
            Esqueci a senha
          </button>
        </div>
      </form>
    </div>
  );
}
