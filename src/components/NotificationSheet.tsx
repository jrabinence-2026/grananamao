import { useEffect, useState } from "react";
import { X, Bell, Trash2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  message: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNotificationsUpdated?: () => void;
}

export function NotificationSheet({ open, onClose, onNotificationsUpdated }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca notificações toda vez que o painel é aberto — sempre dados frescos do banco
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, message, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const clearedList = getClearedList();
      const filtered = data.filter((n) => !clearedList.includes(n.id));
      setNotifications(filtered);
      // Marca como vistos para remover o badge imediatamente
      markAllAsSeen(filtered.map((n) => n.id));
    }
    setLoading(false);
  };

  const getClearedList = (): string[] => {
    try {
      const stored = localStorage.getItem("fintrack_cleared_notifications");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const markAllAsSeen = (ids: string[]) => {
    try {
      const stored = localStorage.getItem("fintrack_seen_notifications");
      const seenList: string[] = stored ? JSON.parse(stored) : [];
      const merged = Array.from(new Set([...seenList, ...ids]));
      localStorage.setItem("fintrack_seen_notifications", JSON.stringify(merged));
    } catch {}
    if (onNotificationsUpdated) {
      onNotificationsUpdated();
    }
  };

  const saveClearedList = (list: string[]) => {
    localStorage.setItem("fintrack_cleared_notifications", JSON.stringify(list));
    if (onNotificationsUpdated) {
      onNotificationsUpdated();
    }
  };

  const handleClearSingle = (id: string) => {
    const cleared = getClearedList();
    const updated = [...cleared, id];
    saveClearedList(updated);
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    const cleared = getClearedList();
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...cleared, ...allIds]));
    saveClearedList(updated);
    setNotifications([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={onClose} />

      <div
        className="relative w-full max-w-[420px] bg-navy-elevated rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom flex flex-col"
        style={{ maxHeight: "80vh" }}
      >
        <div className="mx-auto w-12 h-1.5 rounded-full bg-cream/10 mb-4" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-cream flex items-center gap-2">
            <Bell size={20} className="text-orange" /> Avisos e Notificações
          </h2>
          <button onClick={onClose} className="p-2 bg-navy rounded-full text-cream-muted border border-cream/5 active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
              <p className="text-xs text-cream-muted mt-2">Buscando avisos...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="h-12 w-12 bg-cream/5 rounded-full flex items-center justify-center">
                <CheckCircle2 size={24} className="text-[#4CAF50]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-cream">Tudo limpo!</h4>
                <p className="text-xs text-cream-muted max-w-xs mt-1">
                  Nenhum aviso novo no momento. Você está atualizado.
                </p>
              </div>
            </div>
          ) : (
            <>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="bg-navy border border-cream/5 rounded-2xl p-4 flex justify-between gap-4 items-start animate-in fade-in duration-200"
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-cream leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-cream-muted/70 block">
                      {new Date(n.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleClearSingle(n.id)}
                    className="p-2 hover:bg-red-500/10 hover:text-red-500 text-cream-muted rounded-xl transition-colors shrink-0"
                    title="Limpar aviso"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              <button
                onClick={handleClearAll}
                className="w-full mt-4 py-3 border border-cream/10 rounded-xl text-xs font-bold text-cream hover:bg-cream/5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Trash2 size={14} />
                Limpar Todos os Avisos
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
