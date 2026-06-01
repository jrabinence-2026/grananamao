import { useState, useEffect } from "react";
import { X, Users, Activity, ShieldAlert, KeyRound, Bell, Loader2, Search, CheckCircle2, XCircle, Pencil, Trash2, Eye, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AdminUser {
  id: string;
  name: string;
  phone: string;
  username: string;
  birth_date: string;
  is_blocked: boolean;
  last_seen: string | null;
}

function validatePassword(pwd: string): string[] {
  const errors: string[] = [];
  if (pwd.length < 6) errors.push("Mínimo 6 caracteres");
  if (!/[A-Z]/.test(pwd)) errors.push("1 letra maiúscula (A–Z)");
  if (!/[0-9]/.test(pwd)) errors.push("1 número (0–9)");
  if (!/[^A-Za-z0-9]/.test(pwd)) errors.push("1 caractere especial (!@#$...)");
  return errors;
}

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [notificationMsg, setNotificationMsg] = useState("");
  const [notificationStatus, setNotificationStatus] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{ userId: string; userName: string } | null>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [sentNotifications, setSentNotifications] = useState<{ id: string; message: string; created_at: string; is_active: boolean }[]>([]);
  const [editingNotification, setEditingNotification] = useState<{ id: string; message: string } | null>(null);
  const [showOnlineList, setShowOnlineList] = useState(false);

  const pwdErrors = validatePassword(newPassword);

  useEffect(() => {
    fetchUsers();
    fetchSentNotifications();

    // Realtime: atualiza lista de usuários quando os dados do perfil mudam (heartbeat, bloqueio, etc.)
    const channel = supabase
      .channel("admin-profiles-listener")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as AdminUser;
          setUsers((prev) =>
            prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSentNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, message, created_at, is_active")
      .order("created_at", { ascending: false });
    if (data) {
      setSentNotifications(data);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, phone, username, birth_date, is_blocked, last_seen")
      .order("name");

    if (data) {
      setUsers(data as AdminUser[]);
    } else {
      console.error(error);
    }
    setLoading(false);
  };

  const handleBlockUser = async (id: string, currentBlockedStatus: boolean) => {
    setProcessingId(id);
    const newStatus = !currentBlockedStatus;
    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: newStatus })
      .eq("id", id);
    
    if (!error) {
      setUsers(users.map(u => u.id === id ? { ...u, is_blocked: newStatus } : u));
    }
    setProcessingId(null);
  };

  const handleSaveNewPassword = async (userId: string, userName: string, passwordVal: string) => {
    if (!passwordVal.trim()) return;
    setIsSavingPassword(true);
    try {
      const { data, error } = await supabase.rpc("admin_change_password", {
        target_user_id: userId,
        new_password: passwordVal
      });

      if (!error && data) {
        setConfirmModal(null);
        setInfoModal({
          title: "Senha Alterada",
          message: `A senha de ${userName} foi alterada para "${passwordVal}" com sucesso!`
        });
        setNewPassword("");
      } else {
        setInfoModal({
          title: "Erro ao Alterar Senha",
          message: error?.message || "Ocorreu um erro ao tentar alterar a senha no banco de dados."
        });
      }
    } catch (err: any) {
      console.error("Erro completo da redefinição de senha:", err);
      let errorMsg = "Não foi possível se comunicar com o banco de dados.";
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === "object" && err !== null) {
        errorMsg = err.message || JSON.stringify(err);
      } else if (typeof err === "string") {
        errorMsg = err;
      }
      setInfoModal({
        title: "Erro ao Alterar Senha",
        message: errorMsg
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationMsg.trim()) return;
    setNotificationStatus("Enviando...");
    
    const { error } = await supabase
      .from("notifications")
      .insert({ message: notificationMsg });
      
    if (!error) {
      setNotificationStatus("✅ Enviada!");
      setNotificationMsg("");
      fetchSentNotifications();
      setTimeout(() => setNotificationStatus(""), 3000);
    } else {
      setNotificationStatus("Erro ao enviar");
    }
  };

  const handleDeleteNotification = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);
    if (!error) {
      setSentNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const handleSaveEditNotification = async () => {
    if (!editingNotification || !editingNotification.message.trim()) return;
    const { error } = await supabase
      .from("notifications")
      .update({ message: editingNotification.message })
      .eq("id", editingNotification.id);
    if (!error) {
      setSentNotifications(prev => prev.map(n => n.id === editingNotification.id ? { ...n, message: editingNotification.message } : n));
      setEditingNotification(null);
    }
  };

  const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

  const isOnline = (lastSeen: string | null): boolean => {
    if (!lastSeen) return false;
    return (new Date().getTime() - new Date(lastSeen).getTime()) < ONLINE_THRESHOLD_MS;
  };

  const activeUsersLast24h = users.filter(u => {
    if (!u.last_seen) return false;
    return (new Date().getTime() - new Date(u.last_seen).getTime()) < 1000 * 60 * 60 * 24;
  }).length;

  const onlineUsers = users.filter(u => isOnline(u.last_seen));

  const filteredUsers = users.filter(u => 
    (u.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
    (u.username?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (u.phone || "").includes(search)
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-navy animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between px-4 py-5 border-b border-cream/5 bg-navy/90 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-xl font-bold text-orange flex items-center gap-2">
          <ShieldAlert size={20} /> Painel de Administração
        </h1>
        <button onClick={onClose} className="p-2 bg-navy-elevated rounded-full border border-cream/10 text-cream-muted">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        
        {/* Resumo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-navy-elevated border border-cream/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <Users size={24} className="text-cream mb-2" />
            <h3 className="text-2xl font-black text-cream">{users.length}</h3>
            <p className="text-xs text-cream-muted font-medium uppercase">Total de Usuários</p>
          </div>
          <div className="bg-navy-elevated border border-cream/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <Activity size={24} className="text-[#4CAF50] mb-2" />
            <h3 className="text-2xl font-black text-[#4CAF50]">{activeUsersLast24h}</h3>
            <p className="text-xs text-cream-muted font-medium uppercase">Ativos 24h</p>
          </div>
        </div>

        {/* Card: Online Agora */}
        <div className="bg-navy-elevated border border-cream/10 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowOnlineList((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-cream/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Eye size={20} className="text-[#4FC3F7]" />
                {onlineUsers.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#4CAF50] animate-pulse" />
                )}
              </div>
              <span className="text-sm font-bold text-cream">Online Agora</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black ${ onlineUsers.length > 0 ? "text-[#4CAF50]" : "text-cream-muted" }`}>
                {onlineUsers.length}
              </span>
              <ChevronDown
                size={16}
                className={`text-cream-muted transition-transform duration-200 ${ showOnlineList ? "rotate-180" : "" }`}
              />
            </div>
          </button>

          {/* Lista expandível de usuários online */}
          {showOnlineList && (
            <div className="border-t border-cream/5 px-4 pb-4 pt-2 space-y-2 max-h-64 overflow-y-auto">
              {onlineUsers.length === 0 ? (
                <p className="text-center text-xs text-cream-muted py-4">Nenhum usuário online no momento.</p>
              ) : (
                onlineUsers.map((u) => {
                  const minsAgo = Math.max(
                    0,
                    Math.floor((new Date().getTime() - new Date(u.last_seen!).getTime()) / 60000)
                  );
                  return (
                    <div key={u.id} className="flex items-center gap-3 py-2 border-b border-cream/5 last:border-0">
                      {/* Indicador verde */}
                      <span className="h-2.5 w-2.5 rounded-full bg-[#4CAF50] shrink-0 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-cream truncate">{u.name}</p>
                        <p className="text-[10px] text-cream-muted">@{u.username}</p>
                      </div>
                      <span className="text-[10px] text-[#4CAF50] font-bold shrink-0">
                        {minsAgo === 0 ? "agora" : `${minsAgo}min`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Notificações Globais */}
        <div className="bg-navy-elevated border border-cream/10 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-cream flex items-center gap-2">
            <Bell size={16} className="text-orange" /> Nova Notificação Global
          </h2>
          <textarea
            value={notificationMsg}
            onChange={(e) => setNotificationMsg(e.target.value)}
            placeholder="Digite um aviso para todos os usuários..."
            className="w-full bg-navy border border-cream/10 rounded-xl p-3 text-sm text-cream outline-none focus:border-orange resize-none h-20"
          ></textarea>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#4CAF50]">{notificationStatus}</span>
            <button
              onClick={handleSendNotification}
              disabled={!notificationMsg.trim()}
              className="bg-orange text-white text-xs font-bold px-5 py-2 rounded-lg active:scale-95 transition-transform disabled:opacity-50"
            >
              Enviar para Todos
            </button>
          </div>
        </div>

        {/* Avisos Enviados */}
        <div className="bg-navy-elevated border border-cream/10 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-cream flex items-center gap-2">
            <Bell size={16} className="text-orange" /> Avisos Enviados
          </h2>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {sentNotifications.map((n) => (
              <div key={n.id} className="bg-navy/50 border border-cream/5 rounded-xl p-3 flex justify-between gap-3 items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-cream line-clamp-2">{n.message}</p>
                  <span className="text-[9px] text-cream-muted/70">
                    {new Date(n.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => setEditingNotification({ id: n.id, message: n.message })}
                    className="p-1.5 hover:bg-orange/10 hover:text-orange text-cream-muted rounded-lg transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button 
                    onClick={() => handleDeleteNotification(n.id)}
                    className="p-1.5 hover:bg-red-500/10 hover:text-red-500 text-cream-muted rounded-lg transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {sentNotifications.length === 0 && (
              <p className="text-center text-xs text-cream-muted py-4">Nenhum aviso enviado.</p>
            )}
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-cream">Usuários Registrados</h2>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-navy-elevated border border-cream/10 rounded-xl pl-10 pr-4 py-3 text-sm text-cream focus:border-orange outline-none"
            />
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-cream-muted" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={30} className="text-orange animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map(u => (
                <div key={u.id} className={`bg-navy-elevated border ${u.is_blocked ? 'border-red-500/50' : 'border-cream/5'} rounded-2xl p-4 flex flex-col gap-3`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-cream">{u.name}</h3>
                      <p className="text-xs text-cream-muted">@{u.username} • {u.phone}</p>
                      <p className="text-[10px] text-cream-muted/70 mt-1">Nasc: {u.birth_date} • Último acesso: {u.last_seen ? new Date(u.last_seen).toLocaleDateString('pt-BR') : 'Nunca'}</p>
                    </div>
                    {u.is_blocked && (
                      <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-md">Bloqueado</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2 border-t border-cream/5">
                    <button
                      onClick={() => handleBlockUser(u.id, u.is_blocked)}
                      disabled={processingId === u.id}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        u.is_blocked 
                          ? "bg-navy border-cream/20 text-cream hover:bg-cream/5" 
                          : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                      }`}
                    >
                      {processingId === u.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                      {u.is_blocked ? "Desbloquear" : "Bloquear"}
                    </button>
                    <button
                      onClick={() => setConfirmModal({ userId: u.id, userName: u.name })}
                      disabled={processingId === u.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-navy border border-cream/10 text-cream-muted hover:text-cream text-xs font-bold transition-colors"
                    >
                      <KeyRound size={14} />
                      Forçar Senha
                    </button>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-sm text-cream-muted py-5">Nenhum usuário encontrado.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Alteração de Senha customizado */}
      {confirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-navy-elevated border border-cream/10 rounded-3xl p-6 shadow-2xl scale-in duration-200">
            <h3 className="text-lg font-bold text-cream mb-2 flex items-center gap-2">
              <KeyRound className="text-orange" size={20} /> Definir Nova Senha
            </h3>
            <p className="text-xs text-cream-muted mb-4 leading-relaxed">
              Defina a nova senha de acesso para <span className="text-cream font-semibold">{confirmModal.userName}</span>.
            </p>
            
            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="Digite a nova senha..."
                value={newPassword}
                disabled={isSavingPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-navy border border-cream/10 rounded-xl px-4 py-3 text-sm text-cream focus:border-orange outline-none disabled:opacity-50"
              />

              {newPassword && (
                <div className="rounded-xl bg-navy/40 p-3 space-y-1.5 border border-cream/5">
                  {[
                    "Mínimo 6 caracteres",
                    "1 letra maiúscula (A–Z)",
                    "1 número (0–9)",
                    "1 caractere especial (!@#$...)",
                  ].map((rule) => {
                    const passed = !pwdErrors.includes(rule);
                    return (
                      <div key={rule} className="flex items-center gap-2">
                        {passed ? (
                          <CheckCircle2 size={13} className="text-[#4CAF50] shrink-0" />
                        ) : (
                          <XCircle size={13} className="text-orange/60 shrink-0" />
                        )}
                        <span className={`text-[11px] ${passed ? "text-[#4CAF50]" : "text-cream-muted"}`}>
                          {rule}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmModal(null);
                  setNewPassword("");
                }}
                disabled={isSavingPassword}
                className="flex-1 py-3 rounded-xl border border-cream/10 text-cream-muted font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (pwdErrors.length > 0 || isSavingPassword) return;
                  handleSaveNewPassword(confirmModal.userId, confirmModal.userName, newPassword);
                }}
                disabled={pwdErrors.length > 0 || isSavingPassword}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-orange text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                {isSavingPassword ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Salvar Senha"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Informação customizado */}
      {infoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-navy-elevated border border-cream/10 rounded-3xl p-6 shadow-2xl scale-in duration-200">
            <h3 className="text-lg font-bold text-cream mb-2 flex items-center gap-2">
              <ShieldAlert className="text-orange" size={20} /> {infoModal.title}
            </h3>
            <p className="text-sm text-cream-muted mb-6 leading-relaxed">
              {infoModal.message}
            </p>
            <button
              onClick={() => setInfoModal(null)}
              className="w-full py-3 rounded-xl bg-orange text-white font-bold text-sm active:scale-95 transition-transform"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal de Edição de Notificação */}
      {editingNotification && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-navy-elevated border border-cream/10 rounded-3xl p-6 shadow-2xl scale-in duration-200">
            <h3 className="text-lg font-bold text-cream mb-2 flex items-center gap-2">
              <Pencil className="text-orange" size={20} /> Editar Aviso
            </h3>
            <p className="text-xs text-cream-muted mb-4 leading-relaxed">
              Edite a mensagem do aviso que será exibido aos usuários.
            </p>
            
            <div className="space-y-4 mb-6">
              <textarea
                value={editingNotification.message}
                onChange={(e) => setEditingNotification({ ...editingNotification, message: e.target.value })}
                className="w-full bg-navy border border-cream/10 rounded-xl p-3 text-sm text-cream outline-none focus:border-orange resize-none h-24"
              ></textarea>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingNotification(null)}
                className="flex-1 py-3 rounded-xl border border-cream/10 text-cream-muted font-bold text-sm active:scale-95 transition-transform"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditNotification}
                disabled={!editingNotification.message.trim()}
                className="flex-1 py-3 rounded-xl bg-orange text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
