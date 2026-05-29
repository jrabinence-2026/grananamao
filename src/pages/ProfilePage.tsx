import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Target,
  Bell,
  Moon,
  Banknote,
  Lock,
  LogOut,
  ChevronRight,
  X,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Camera,
  HelpCircle,
  Sun
} from "lucide-react";
import { useStore, fmtBRL } from "@/lib/store";
import { supabase } from "@/lib/supabase";

// 1. FUNCIONALIDADE: Definição dos avatares padrões da plataforma (Dicebear Adventurer e Croodles)
const DEFAULT_AVATARS = [
  // Adventurer avatars
  { id: "adv_1", label: "Félix", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix" },
  { id: "adv_2", label: "Aneka", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka" },
  { id: "adv_3", label: "Jack", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack" },
  { id: "adv_4", label: "Lilith", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Lilith" },
  { id: "adv_5", label: "Ryan", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Ryan" },
  { id: "adv_6", label: "Zoey", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoey" },
  // Croodles avatars
  { id: "cro_1", label: "Oliver", url: "https://api.dicebear.com/7.x/croodles/svg?seed=Oliver" },
  { id: "cro_2", label: "Jack C.", url: "https://api.dicebear.com/7.x/croodles/svg?seed=Jack" },
  { id: "cro_3", label: "Aneka C.", url: "https://api.dicebear.com/7.x/croodles/svg?seed=Aneka" },
  { id: "cro_4", label: "Felix C.", url: "https://api.dicebear.com/7.x/croodles/svg?seed=Felix" },
  { id: "cro_5", label: "Ryan C.", url: "https://api.dicebear.com/7.x/croodles/svg?seed=Ryan" },
  { id: "cro_6", label: "Zoey C.", url: "https://api.dicebear.com/7.x/croodles/svg?seed=Zoey" },
];


/**
 * Componente ProfilePage (Perfil do Usuário).
 * Apresenta a interface de configurações pessoais seguindo o modelo visual da imagem:
 * - Cabeçalho com logo e iniciais do usuário.
 * - Foto de perfil (iniciais estilizadas) com nome e e-mail.
 * - Lista de opções interativas (Meta mensal, Notificações, Tema, Moeda, Alterar senha).
 * - Botão de sair da conta.
 */
export function ProfilePage() {
  const { user, logout, reloadProfile, updateUserLocal, theme, toggleTheme } = useStore();
  const navigate = useNavigate();

  // Estados para edição de dados pessoais
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editUsername, setEditUsername] = useState(user?.username ?? "");
  const [editCpf, setEditCpf] = useState(user?.phone ?? "");
  const [editBirthDate, setEditBirthDate] = useState(user?.birth_date ?? "");
  const [dataError, setDataError] = useState("");
  const [dataLoading, setDataLoading] = useState(false);
  const [isWelcome, setIsWelcome] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [tempAvatarKey, setTempAvatarKey] = useState<string | null>(null);
  const [tempCustomBase64, setTempCustomBase64] = useState<string | null>(null);

  // Estados para o Cropper de Foto Customizada
  const [customImageRaw, setCustomImageRaw] = useState<string | null>(null);
  const [cropperZoom, setCropperZoom] = useState<number>(1);
  const [cropperPos, setCropperPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageDims, setImageDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const S = 200; // tamanho do container de preview
  const baseScale = imageDims.width > 0 ? Math.max(S / imageDims.width, S / imageDims.height) : 1;
  const baseDw = imageDims.width * baseScale;
  const baseDh = imageDims.height * baseScale;

  const clampPos = (x: number, y: number, zoom: number) => {
    if (imageDims.width === 0) return { x, y };
    const W_disp = baseDw * zoom;
    const H_disp = baseDh * zoom;
    
    const minX = S / 2 - W_disp / 2;
    const maxX = W_disp / 2 - S / 2;
    const minY = S / 2 - H_disp / 2;
    const maxY = H_disp / 2 - S / 2;
    
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  };

  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    setCropperPos(prev => {
      const nextX = prev.x + dx;
      const nextY = prev.y + dy;
      return clampPos(nextX, nextY, cropperZoom);
    });
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Garante que a foto continue cobrindo o círculo quando o zoom muda
  useEffect(() => {
    if (imageDims.width > 0) {
      setCropperPos(prev => clampPos(prev.x, prev.y, cropperZoom));
    }
  }, [cropperZoom, imageDims]);

  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [cpfStatus, setCpfStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // Estados adicionais para fluxo de senha (Google vs Normal)
  const [hasPassword, setHasPassword] = useState(true);
  const [pwdStep, setPwdStep] = useState(1); // 1: confirmar atual, 2: digitar nova
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwdState, setShowConfirmPwdState] = useState(false);

  useEffect(() => {
    const checkIdentities = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const providers = currentUser.identities?.map(id => id.provider) || [];
        const hasEmailProvider = providers.includes("email");
        const hasMetaPassword = currentUser.user_metadata?.has_password === true;
        setHasPassword(hasEmailProvider || hasMetaPassword);
      }
    };
    checkIdentities();
  }, [user]);

  useEffect(() => {
    if (isAvatarModalOpen && user) {
      setTempAvatarKey(user.avatar_key ?? null);
      setTempCustomBase64(user.custom_avatar_base64 ?? null);
    }
  }, [isAvatarModalOpen, user]);

  const isUsernameFormatOk = editUsername.length >= 6;
  const isCpfFormatOk = validatePhone(editCpf);

  // Debounce para checar disponibilidade de username no Supabase
  useEffect(() => {
    if (!editUsername) {
      setUsernameStatus("idle");
      return;
    }
    if (user && editUsername.toLowerCase().trim() === user.username?.toLowerCase().trim()) {
      setUsernameStatus("available");
      return;
    }
    if (editUsername.length < 6) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const { data: available } = await supabase
        .rpc("is_username_available", { uname: editUsername });
      setUsernameStatus(available ? "available" : "taken");
    }, 600);
    return () => clearTimeout(timer);
  }, [editUsername, user]);

  // Debounce para checar disponibilidade de Telefone no Supabase
  useEffect(() => {
    const cleanCpf = editCpf.replace(/\D/g, "");
    if (!cleanCpf) {
      setCpfStatus("idle");
      return;
    }
    if (user && cleanCpf === user.phone) {
      setCpfStatus("available");
      return;
    }
    if (!isCpfFormatOk) {
      setCpfStatus("idle");
      return;
    }

    setCpfStatus("checking");
    const timer = setTimeout(async () => {
      const { data: available } = await supabase
        .rpc("is_phone_available", { check_phone: editCpf });
      setCpfStatus(available ? "available" : "taken");
    }, 600);
    return () => clearTimeout(timer);
  }, [editCpf, user, isCpfFormatOk]);

  // 1b. FUNCIONALIDADE: Renderiza o avatar selecionado (gradiente + emoji), foto customizada ou o padrão de iniciais
  const renderAvatar = (size: "sm" | "lg") => {
    const avatarKey = user?.avatar_key;

    if (avatarKey === "custom" && user?.custom_avatar_base64) {
      return (
        <img
          src={user.custom_avatar_base64}
          alt="Avatar"
          className={`rounded-full object-cover shadow-lg border border-cream/10 shrink-0 ${size === "sm" ? "h-10 w-10" : "h-24 w-24"
            }`}
        />
      );
    }

    const selected = DEFAULT_AVATARS.find(a => a.id === avatarKey);
    if (selected) {
      return (
        <img
          src={selected.url}
          alt={selected.label}
          className={`rounded-full object-cover shadow-lg border border-cream/10 bg-[#0B0F1C] shrink-0 ${size === "sm" ? "h-10 w-10" : "h-24 w-24"
            }`}
        />
      );
    }

    return (
      <div className={`rounded-full bg-cream flex items-center justify-center font-bold text-navy shadow-md shrink-0 ${size === "sm" ? "h-10 w-10 text-sm" : "h-24 w-24 text-3xl border-2 border-orange/20"
        }`}>
        {initials}
      </div>
    );
  };

  useEffect(() => {
    if (user) {
      const parts = (user.name || "").trim().split(/\s+/);
      setEditFirstName(parts[0] || "");
      setEditLastName(parts.slice(1).join(" ") || "");
      setEditUsername(user.username);
      setEditCpf(user.phone);
      setEditBirthDate(user.birth_date);
    }
  }, [user]);

  useEffect(() => {
    const isNew = sessionStorage.getItem("grananamao.welcome_new_user");
    if (isNew === "true" || (user && user.phone && user.phone.startsWith("000000000"))) {
      setIsWelcome(true);
      setIsDataModalOpen(true);
      sessionStorage.removeItem("grananamao.welcome_new_user");
    }
  }, [user]);

  // 1. FUNCIONALIDADE: Iniciais dinâmicas do nome do usuário (ex: "João Silva" -> "JS")
  const getInitials = (name: string) => {
    if (!name) return "JS";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  const initials = getInitials(user?.name ?? "João Silva");

  // 2. FUNCIONALIDADE: Meta Mensal Editável (carrega/salva do LocalStorage e Supabase)
  const [monthlyLimit, setMonthlyLimit] = useState<number>(0);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [tempLimit, setTempLimit] = useState("0");

  useEffect(() => {
    if (user) {
      setMonthlyLimit(user.monthly_limit);
      setTempLimit(user.monthly_limit.toString());
    } else {
      const saved = localStorage.getItem("fintrack.profile.monthly_limit");
      if (saved) {
        setMonthlyLimit(Number(saved));
        setTempLimit(saved);
      }
    }
  }, [user]);

  const handleSaveLimit = async () => {
    // Valida e salva a nova meta mensal configurada pelo usuário
    const num = parseFloat(tempLimit.replace(",", "."));
    if (!isNaN(num) && num >= 0) {
      setMonthlyLimit(num);
      localStorage.setItem("fintrack.profile.monthly_limit", num.toString());
      if (user) {
        await supabase
          .from("profiles")
          .update({ monthly_limit: num })
          .eq("id", user.id);
        await reloadProfile();
      }
    }
    setIsLimitModalOpen(false);
  };

  // 3. FUNCIONALIDADE: Toggle de Notificações (carrega/salva do LocalStorage)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("fintrack.profile.notifications");
    return saved !== "false"; // Padrão ativo
  });

  const toggleNotifications = () => {
    // Alterna o status das notificações (ATIVO / INATIVO)
    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    localStorage.setItem("fintrack.profile.notifications", String(nextVal));
  };

  // 5. FUNCIONALIDADE: Alternador de Moedas (Fixado em BRL e alerta de indisponibilidade)
  const [currency] = useState("BRL (R$)");
  const [currencyError, setCurrencyError] = useState("");

  const toggleCurrency = () => {
    setCurrencyError("Apenas BRL (R$) está disponível no momento.");
    setTimeout(() => setCurrencyError(""), 3000);
  };

  // 6. FUNCIONALIDADE: Alterar Senha (abre modal interativo)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  const pwdErrors = validatePassword(newPassword);
  const isPwdValid = pwdErrors.length === 0;

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!hasPassword) {
      // Configurar senha para usuário Google
      if (pwdErrors.length > 0) {
        setPwdError("A senha não atende a todos os requisitos.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setPwdError("As senhas não coincidem.");
        return;
      }

      setDataLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { has_password: true }
      });
      if (error) {
        setPwdError(error.message);
      } else {
        setPwdSuccess("✅ Senha configurada! Agora você pode logar com CPF, e-mail ou usuário.");
        setNewPassword("");
        setConfirmPassword("");
        setHasPassword(true);
        setTimeout(() => {
          setPwdSuccess("");
          setIsPasswordModalOpen(false);
        }, 3500);
      }
      setDataLoading(false);
    } else {
      // Alterar senha existente
      if (pwdStep === 1) {
        setDataLoading(true);
        // Verifica a senha atual tentando fazer login
        const { error } = await supabase.auth.signInWithPassword({
          email: user?.email ?? "",
          password: currentPassword
        });
        if (error) {
          setPwdError("Senha atual incorreta.");
        } else {
          setPwdStep(2);
        }
        setDataLoading(false);
      } else {
        if (pwdErrors.length > 0) {
          setPwdError("A nova senha não atende a todos os requisitos.");
          return;
        }
        if (newPassword !== confirmPassword) {
          setPwdError("As senhas não coincidem.");
          return;
        }

        setDataLoading(true);
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
          data: { has_password: true }
        });
        if (error) {
          setPwdError(error.message);
        } else {
          setPwdSuccess("✅ Senha alterada com sucesso!");
          setNewPassword("");
          setConfirmPassword("");
          setCurrentPassword("");
          setPwdStep(1);
          setTimeout(() => {
            setPwdSuccess("");
            setIsPasswordModalOpen(false);
          }, 2000);
        }
        setDataLoading(false);
      }
    }
  };

  // 1c. FUNCIONALIDADE: Define temporariamente o avatar selecionado
  const handleSelectAvatar = (avatarId: string) => {
    setTempAvatarKey(avatarId);
    setTempCustomBase64(null);
  };

  // 1d. FUNCIONALIDADE: Remove temporariamente o avatar selecionado para voltar a usar iniciais
  const handleRemoveAvatar = () => {
    setTempAvatarKey(null);
    setTempCustomBase64(null);
  };

  // 1e. FUNCIONALIDADE: Lê a foto selecionada do aparelho e a salva temporariamente para edição
  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDataLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setCustomImageRaw(event.target?.result as string);
        setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
        setCropperZoom(1);
        setCropperPos({ x: 0, y: 0 });
        setTempAvatarKey("custom");
        setTempCustomBase64(null);
        setDataLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const getCroppedImage = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!customImageRaw) {
        reject("Nenhuma imagem selecionada");
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const C = 150;
          canvas.width = C;
          canvas.height = C;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject("Contexto do Canvas indisponível");
            return;
          }
          // Fundo azul marinho escuro padrão
          ctx.fillStyle = "#0B0F1C";
          ctx.fillRect(0, 0, C, C);

          const K = C / S;
          const canvasCenterX = C / 2 + cropperPos.x * K;
          const canvasCenterY = C / 2 + cropperPos.y * K;
          const canvasDw = baseDw * cropperZoom * K;
          const canvasDh = baseDh * cropperZoom * K;
          const canvasX = canvasCenterX - canvasDw / 2;
          const canvasY = canvasCenterY - canvasDh / 2;

          ctx.drawImage(img, canvasX, canvasY, canvasDw, canvasDh);
          const base64 = canvas.toDataURL("image/jpeg", 0.85);
          resolve(base64);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => reject(err);
      img.src = customImageRaw;
    });
  };

  // 1f. FUNCIONALIDADE: Salva de fato as alterações do avatar no Supabase (Auth + profiles)
  const handleConfirmAvatar = async () => {
    if (!user) return;
    setDataLoading(true);
    setDataError("");

    try {
      let finalCustomBase64 = tempCustomBase64;

      if (tempAvatarKey === "custom" && customImageRaw) {
        finalCustomBase64 = await getCroppedImage();
      }

      await supabase.auth.updateUser({
        data: {
          avatar_key: tempAvatarKey,
          custom_avatar_base64: finalCustomBase64
        }
      });

      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_key: tempAvatarKey,
          custom_avatar_base64: finalCustomBase64
        })
        .eq("id", user.id);

      if (!error) {
        // Atualiza a UI imediatamente de forma otimista
        updateUserLocal({
          avatar_key: tempAvatarKey ?? undefined,
          custom_avatar_base64: finalCustomBase64 ?? undefined
        });
        
        await reloadProfile();
        // Limpar estados do cropper
        setCustomImageRaw(null);
        setCropperZoom(1);
        setCropperPos({ x: 0, y: 0 });
        setImageDims({ width: 0, height: 0 });
        setIsAvatarModalOpen(false);
      } else {
        setDataError("Erro ao salvar foto de perfil: " + error.message);
      }
    } catch (err: any) {
      setDataError("Erro ao processar imagem: " + (err?.message || err));
    } finally {
      setDataLoading(false);
    }
  };

  // Fechamento limpo do modal limpando os estados do cropper
  const handleCloseModal = () => {
    setIsAvatarModalOpen(false);
    setCustomImageRaw(null);
    setCropperZoom(1);
    setCropperPos({ x: 0, y: 0 });
    setImageDims({ width: 0, height: 0 });
  };

  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setDataError("");
    setDataLoading(true);

    const cleanCpf = editCpf.replace(/\D/g, "");

    // Validações
    if (!editFirstName.trim() || !editLastName.trim()) {
      setDataError("O nome e o sobrenome são obrigatórios.");
      setDataLoading(false);
      return;
    }
    if (editUsername.length < 6) {
      setDataError("O nome de usuário deve ter pelo menos 6 caracteres.");
      setDataLoading(false);
      return;
    }
    if (usernameStatus === "taken") {
      setDataError("Este nome de usuário já está em uso.");
      setDataLoading(false);
      return;
    }
    if (cpfStatus === "taken") {
      setDataError("Este celular já está cadastrado.");
      setDataLoading(false);
      return;
    }

    const isPlaceholderPhone = cleanCpf.startsWith("000000000");
    if (!isPlaceholderPhone) {
      const phoneOk = validatePhone(editCpf);
      if (!phoneOk) {
        setDataError("Celular inválido.");
        setDataLoading(false);
        return;
      }
    } else {
      setDataError("Por favor, preencha um celular válido.");
      setDataLoading(false);
      return;
    }

    if (!editBirthDate) {
      setDataError("Informe a data de nascimento.");
      setDataLoading(false);
      return;
    }

    const ageOk = validateAge(editBirthDate);
    if (!ageOk) {
      setDataError("Menores de 14 anos não podem se cadastrar.");
      setDataLoading(false);
      return;
    }

    const fullName = `${editFirstName.trim()} ${editLastName.trim()}`;

    const { error } = await supabase
      .from("profiles")
      .update({
        name: fullName,
        username: editUsername.toLowerCase().trim(),
        phone: cleanCpf,
        birth_date: editBirthDate
      })
      .eq("id", user?.id);

    if (error) {
      if (error.message.includes("profiles_username_key")) {
        setDataError("Este nome de usuário já está em uso.");
      } else if (error.message.includes("profiles_phone_key") || error.message.includes("profiles_cpf_key")) {
        setDataError("Este celular já está cadastrado.");
      } else {
        setDataError("Erro ao salvar dados: " + error.message);
      }
    } else {
      await reloadProfile();
      setSuccessMsg("✅ Dados atualizados com sucesso!");
      setTimeout(() => {
        setSuccessMsg("");
        setIsDataModalOpen(false);
        setIsWelcome(false);
      }, 2000);
    }
    setDataLoading(false);
  };

  return (
    <div className="min-h-screen bg-navy pb-24">
      <header className="sticky top-0 z-40 bg-navy/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-cream/5">
        <div className="flex items-center gap-2">
          <img src="/img/logo.png" alt="GranaNaMao Logo" className="h-8 w-auto object-contain" />
          <span className="text-xl font-extrabold text-orange tracking-tight">GranaNaMao</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleNotifications}
            className="h-10 w-10 rounded-full bg-navy-elevated flex items-center justify-center border border-cream/10 relative transition-transform active:scale-95"
          >
            <Bell size={18} className="text-cream" />
            {notificationsEnabled && (
              <span className="absolute mt-[-10px] ml-3 h-2 w-2 rounded-full bg-orange" />
            )}
          </button>
          {renderAvatar("sm")}
        </div>
      </header>

      {/* 8. FUNCIONALIDADE: Avatar principal de perfil (Interativo para escolher avatar padrão) */}
      <div className="flex flex-col items-center py-8">
        <button
          onClick={() => setIsAvatarModalOpen(true)}
          className="relative group transition-transform hover:scale-105 active:scale-95 outline-none rounded-full"
        >
          {renderAvatar("lg")}
          <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-orange text-white flex items-center justify-center border-2 border-navy shadow-md transition-colors group-hover:bg-orange/90">
            <Camera size={13} />
          </div>
        </button>
        <h2 className="mt-4 text-xl font-bold text-cream">{user?.name ?? "João Silva"}</h2>
        <p className="text-xs text-cream-muted mt-1">{user?.email ?? "joao@email.com"}</p>
      </div>

      {/* 9. FUNCIONALIDADE: Lista de opções de configuração */}
      <div className="px-4 space-y-4">
        <div className="rounded-2xl bg-navy-elevated border border-cream/5 divide-y divide-cream/5">

          {/* Opção: Meta mensal */}
          <button
            onClick={() => { setTempLimit(monthlyLimit.toString()); setIsLimitModalOpen(true); }}
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-cream/5 active:bg-cream/5"
          >
            <div className="flex items-center gap-3">
              <Target size={18} className="text-cream-muted" />
              <span className="text-sm font-medium text-cream">Meta de gasto mensal</span>
            </div>
            <span className="text-sm font-semibold text-cream">
              {fmtBRL(monthlyLimit)}
            </span>
          </button>

          {/* Opção: Notificações */}
          <button
            onClick={toggleNotifications}
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-cream/5 active:bg-cream/5"
          >
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-cream-muted" />
              <span className="text-sm font-medium text-cream">Notificações</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${notificationsEnabled
                ? "bg-[#4CAF50]/15 text-[#4CAF50]"
                : "bg-cream-muted/10 text-cream-muted"
              }`}>
              {notificationsEnabled ? "ATIVO" : "INATIVO"}
            </span>
          </button>

          {/* Opção: Tema */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-cream/5 active:bg-cream/5"
          >
            <div className="flex items-center gap-3">
              {theme === "light" ? <Sun size={18} className="text-cream-muted" /> : <Moon size={18} className="text-cream-muted" />}
              <span className="text-sm font-medium text-cream">Tema</span>
            </div>
            <span className="text-sm font-semibold text-cream-muted">
              {theme === "light" ? "Claro" : "Escuro"}
            </span>
          </button>

          {/* Opção: Moeda */}
          <button
            onClick={toggleCurrency}
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-cream/5 active:bg-cream/5"
          >
            <div className="flex items-center gap-3">
              <Banknote size={18} className="text-cream-muted" />
              <span className="text-sm font-medium text-cream">Moeda</span>
            </div>
            <span className="text-sm font-semibold text-cream-muted">
              {currency}
            </span>
          </button>

          {/* Opção: Meus Dados */}
          <button
            onClick={() => setIsDataModalOpen(true)}
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-cream/5 active:bg-cream/5"
          >
            <div className="flex items-center gap-3">
              <User size={18} className="text-cream-muted" />
              <span className="text-sm font-medium text-cream">Meus dados</span>
            </div>
            <ChevronRight size={16} className="text-cream-muted" />
          </button>

          {/* Opção: Alterar / Configurar Senha */}
          <button
            onClick={() => {
              setPwdError("");
              setPwdSuccess("");
              setNewPassword("");
              setConfirmPassword("");
              setCurrentPassword("");
              setPwdStep(1);
              setIsPasswordModalOpen(true);
            }}
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-cream/5 active:bg-cream/5"
          >
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-cream-muted" />
              <span className="text-sm font-medium text-cream">
                {hasPassword ? "Alterar senha" : "Configurar senha de acesso"}
              </span>
            </div>
            <ChevronRight size={16} className="text-cream-muted" />
          </button>

          {/* Opção: Suporte / Ajuda */}
          <a
            href="https://wa.me/5598984026886?text=preciso%20de%20ajuda%20com%20o%20app"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-cream/5 active:bg-cream/5"
          >
            <div className="flex items-center gap-3">
              <HelpCircle size={18} className="text-cream-muted" />
              <span className="text-sm font-medium text-cream">Suporte</span>
            </div>
            <span className="text-[10px] font-semibold text-cream-muted/50 pr-2">
              Precisa de ajuda?
            </span>
          </a>

        </div>

        {/* 10. FUNCIONALIDADE: Botão de Sair da conta (aguarda logout assíncrono do Supabase) */}
        <button
          onClick={async () => { await logout(); navigate({ to: "/" }); }}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-navy-elevated border border-cream/10 active:border-orange/20 text-orange font-bold transition-all text-sm"
        >
          <LogOut size={16} /> Sair da conta
        </button>

      </div>
      {/* 12. FUNCIONALIDADE: Modal para editar a Meta Mensal */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsLimitModalOpen(false)} />
          <div className="relative w-full max-w-[420px] bg-navy-elevated rounded-t-3xl p-5 pb-8 border-t border-cream/10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-cream">Definir meta de gasto mensal</h2>
              <button onClick={() => setIsLimitModalOpen(false)} className="text-cream-muted">
                <X size={22} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-cream-muted mb-1.5">Valor da Meta (R$)</label>
                <input
                  type="text"
                  value={tempLimit}
                  onChange={(e) => setTempLimit(e.target.value)}
                  placeholder="Ex: 2000"
                  inputMode="decimal"
                  className="w-full px-4 py-3.5 rounded-xl bg-navy border border-cream/20 text-cream outline-none focus:border-orange font-semibold"
                />
              </div>
              <button
                onClick={handleSaveLimit}
                className="w-full py-3.5 rounded-xl bg-orange text-white font-bold transition-all active:opacity-95"
              >
                Salvar meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. FUNCIONALIDADE: Modal para alteração de Senha ou Configuração de Senha */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => !dataLoading && setIsPasswordModalOpen(false)} />
          <div className="relative w-full max-w-[420px] bg-navy-elevated rounded-t-3xl p-5 pb-8 border-t border-cream/10 animate-in slide-in-from-bottom duration-200">
            {pwdSuccess ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="h-16 w-16 rounded-full bg-[#4CAF50]/15 flex items-center justify-center">
                  <CheckCircle2 size={36} className="text-[#4CAF50]" />
                </div>
                <h3 className="text-lg font-bold text-cream">Sucesso!</h3>
                <p className="text-sm text-cream-muted px-4 leading-relaxed">{pwdSuccess}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-cream">
                    {!hasPassword ? "Configurar senha de acesso" : pwdStep === 1 ? "Confirmar senha atual" : "Definir nova senha"}
                  </h2>
                  <button onClick={() => !dataLoading && setIsPasswordModalOpen(false)} className="text-cream-muted">
                    <X size={22} />
                  </button>
                </div>

                <form onSubmit={handleSavePassword} className="space-y-4">
                  {hasPassword && pwdStep === 1 ? (
                    /* ETAPA 1: Confirmar senha atual */
                    <div>
                      <label className="block text-xs text-cream-muted mb-1.5">Senha atual</label>
                      <div className="relative">
                        <input
                          type={showCurrentPwd ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full px-4 pr-12 py-3.5 rounded-xl bg-navy border border-cream/20 text-cream outline-none focus:border-orange text-sm font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPwd(v => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream transition-colors"
                          tabIndex={-1}
                        >
                          {showCurrentPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ETAPA 2 ou Configurar Senha (sem senha prévia) */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-cream-muted mb-1.5">
                          {!hasPassword ? "Escolha uma senha forte" : "Nova senha"}
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPwd ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-4 pr-12 py-3.5 rounded-xl bg-navy border border-cream/20 text-cream outline-none focus:border-orange text-sm font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPwd(v => !v)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream transition-colors"
                            tabIndex={-1}
                          >
                            {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-cream-muted mb-1.5">Confirmar nova senha</label>
                        <div className="relative">
                          <input
                            type={showConfirmPwdState ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-4 pr-12 py-3.5 rounded-xl bg-navy border border-cream/20 text-cream outline-none focus:border-orange text-sm font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPwdState(v => !v)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-cream-muted hover:text-cream transition-colors"
                            tabIndex={-1}
                          >
                            {showConfirmPwdState ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Regras visuais da nova senha */}
                      {newPassword && (
                        <div className="rounded-xl bg-navy/60 p-3 space-y-1.5 border border-cream/5 animate-in fade-in duration-200">
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
                  )}

                  {pwdError && (
                    <p className="text-xs text-orange font-medium pl-1">⚠️ {pwdError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={dataLoading || (pwdStep === 2 && !isPwdValid && hasPassword) || (!hasPassword && !isPwdValid && newPassword.length > 0)}
                    className="w-full py-3.5 rounded-xl bg-orange text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {dataLoading && <Loader2 size={18} className="animate-spin" />}
                    {dataLoading ? "Processando..." : hasPassword && pwdStep === 1 ? "Continuar" : "Confirmar alteração"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal para Editar Dados Pessoais */}
      {isDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => !isWelcome && setIsDataModalOpen(false)} />
          <div className="relative w-full max-w-[420px] bg-navy-elevated rounded-t-3xl p-5 pb-8 border-t border-cream/10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-cream">
                  {isWelcome ? "Bem-vindo ao GranaNaMao! 🚀" : "Meus dados"}
                </h2>
                {isWelcome && (
                  <p className="text-xs text-orange font-medium mt-1">
                    Complete seus dados para continuar
                  </p>
                )}
              </div>
              {!isWelcome && (
                <button onClick={() => setIsDataModalOpen(false)} className="text-cream-muted">
                  <X size={22} />
                </button>
              )}
            </div>

            <form onSubmit={handleSaveData} className="space-y-4">
              {/* Campo: Nome e Sobrenome */}
              <div>
                <label className="block text-xs text-cream-muted mb-1.5">Nome e Sobrenome</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="Nome"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-navy border border-cream/10 text-cream outline-none focus:border-orange text-sm"
                  />
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Sobrenome"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-navy border border-cream/10 text-cream outline-none focus:border-orange text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-cream-muted mb-1.5">Nome de usuário</label>
                <div className="relative">
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    required
                    className={`w-full px-4 pr-10 py-3 rounded-xl bg-navy border text-cream outline-none transition-colors text-sm ${usernameStatus === "available" ? "border-[#4CAF50]/60 focus:border-[#4CAF50]" :
                        usernameStatus === "taken" ? "border-orange/60 focus:border-orange" :
                          "border-cream/10 focus:border-orange"
                      }`}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {usernameStatus === "checking" && <Loader2 size={15} className="text-cream-muted animate-spin" />}
                    {usernameStatus === "available" && <CheckCircle2 size={15} className="text-[#4CAF50]" />}
                    {usernameStatus === "taken" && <XCircle size={15} className="text-orange" />}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-cream-muted mb-1.5">Celular</label>
                <div className="relative">
                  <input
                    type="text"
                    value={editCpf}
                    onChange={(e) => setEditCpf(maskPhone(e.target.value))}
                    placeholder="(00) 99999-9999"
                    inputMode="numeric"
                    maxLength={15}
                    required
                    className={`w-full px-4 pr-10 py-3 rounded-xl bg-navy border text-cream outline-none transition-colors text-sm ${cpfStatus === "available" ? "border-[#4CAF50]/60 focus:border-[#4CAF50]" :
                        cpfStatus === "taken" ? "border-orange/60 focus:border-orange" :
                          "border-cream/10 focus:border-orange"
                      }`}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {cpfStatus === "checking" && <Loader2 size={15} className="text-cream-muted animate-spin" />}
                    {cpfStatus === "available" && <CheckCircle2 size={15} className="text-[#4CAF50]" />}
                    {cpfStatus === "taken" && <XCircle size={15} className="text-orange" />}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-cream-muted mb-1.5">Data de Nascimento (mín. 14 anos)</label>
                <input
                  type="date"
                  value={editBirthDate}
                  onChange={(e) => setEditBirthDate(e.target.value)}
                  required
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    minWidth: "100%",
                    minHeight: "46px",
                    boxSizing: "border-box"
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-navy border border-cream/10 text-cream outline-none focus:border-orange text-sm"
                />
              </div>

              {dataError && (
                <p className="text-xs text-orange font-medium pl-1">⚠️ {dataError}</p>
              )}
              {successMsg && (
                <p className="text-xs text-[#4CAF50] font-medium pl-1">{successMsg}</p>
              )}

              <button
                type="submit"
                disabled={dataLoading || usernameStatus === "checking" || cpfStatus === "checking" || usernameStatus === "taken" || cpfStatus === "taken"}
                className="w-full py-3.5 rounded-xl bg-orange text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {dataLoading && <Loader2 size={18} className="animate-spin" />}
                {dataLoading ? "Salvando..." : "Salvar dados"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 13b. FUNCIONALIDADE: Modal de escolha de avatares padrões */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => !dataLoading && handleCloseModal()} />
          <div className="relative w-full max-w-[420px] bg-navy-elevated rounded-t-3xl p-5 pb-8 border-t border-cream/10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-cream">Escolha seu avatar</h2>
                <p className="text-xs text-cream-muted mt-0.5">Selecione um ícone para o seu perfil</p>
              </div>
              <button onClick={() => !dataLoading && handleCloseModal()} className="text-cream-muted hover:text-cream transition-colors">
                <X size={22} />
              </button>
            </div>

                                    {/* Live Preview do Avatar Selecionado ou Cropper */}
            {tempAvatarKey === "custom" && customImageRaw ? (
              <div className="flex flex-col items-center mb-5 mt-2 animate-in fade-in duration-200">
                <div
                  className="relative rounded-full overflow-hidden border-2 border-orange bg-navy cursor-move touch-none animate-in zoom-in duration-200"
                  style={{ width: `${S}px`, height: `${S}px` }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleDragStart(e.clientX, e.clientY);
                  }}
                  onMouseMove={(e) => {
                    e.preventDefault();
                    handleDragMove(e.clientX, e.clientY);
                  }}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  onTouchStart={(e) => {
                    if (e.touches.length === 1) {
                      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  onTouchMove={(e) => {
                    if (e.touches.length === 1) {
                      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  onTouchEnd={handleDragEnd}
                >
                  <img
                    src={customImageRaw}
                    alt="Preview cropper"
                    style={{
                      width: `${baseDw}px`,
                      height: `${baseDh}px`,
                      left: `${(S - baseDw) / 2}px`,
                      top: `${(S - baseDh) / 2}px`,
                      transform: `translate(${cropperPos.x}px, ${cropperPos.y}px) scale(${cropperZoom})`,
                      transformOrigin: "center",
                      position: "absolute",
                      maxWidth: "none",
                      userSelect: "none",
                      pointerEvents: "none"
                    }}
                  />
                </div>
                
                {/* Slider de Zoom */}
                <div className="w-full min-w-[240px] mt-4 px-4">
                  <div className="flex justify-between text-xs text-cream-muted mb-1.5 font-medium">
                    <span>Zoom</span>
                    <span>{cropperZoom.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={cropperZoom}
                    onChange={(e) => setCropperZoom(parseFloat(e.target.value))}
                    className="w-full accent-orange h-1.5 bg-navy rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <p className="text-[10px] text-cream-muted mt-2 text-center max-w-[240px] leading-normal">
                  Arraste a foto para centralizar e use o controle acima para dar zoom
                </p>
              </div>
            ) : (
              <>
                {/* Live Preview do Avatar Selecionado */}
                <div className="flex flex-col items-center mb-5 mt-2">
                  {tempAvatarKey === "custom" && tempCustomBase64 ? (
                    <img
                      src={tempCustomBase64}
                      alt="Preview"
                      className="h-20 w-20 rounded-full object-cover shadow-lg border-2 border-orange"
                    />
                  ) : tempAvatarKey && DEFAULT_AVATARS.find(a => a.id === tempAvatarKey) ? (
                    <img
                      src={DEFAULT_AVATARS.find(a => a.id === tempAvatarKey)?.url}
                      alt="Preview"
                      className="h-20 w-20 rounded-full object-cover shadow-lg bg-navy border-2 border-orange"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-cream flex items-center justify-center font-bold text-navy text-2xl border-2 border-orange/40">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Grade de avatares padrões */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {DEFAULT_AVATARS.map((avatar) => {
                    const isSelected = tempAvatarKey === avatar.id;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => handleSelectAvatar(avatar.id)}
                        disabled={dataLoading}
                        className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 ${isSelected
                            ? "bg-orange/10 border-orange"
                            : "bg-navy border-cream/10 hover:border-cream/20"
                          }`}
                      >
                        <img
                          src={avatar.url}
                          alt={avatar.label}
                          className="h-12 w-12 rounded-full object-cover shadow-md bg-navy-elevated border border-cream/10"
                        />
                        <span className={`text-[10px] font-bold mt-2 tracking-wide ${isSelected ? "text-orange" : "text-cream-muted"}`}>
                          {avatar.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Opções de customização da foto do aparelho */}
                <div className="flex flex-col gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => document.getElementById("avatar-file-input")?.click()}
                    disabled={dataLoading}
                    className="w-full py-3.5 rounded-xl bg-orange text-white font-bold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={14} />
                    Escolher foto do aparelho
                  </button>

                  <input
                    id="avatar-file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCustomAvatarUpload}
                  />
                </div>

                {tempAvatarKey && (
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={dataLoading}
                    className="w-full py-3.5 rounded-xl border border-orange/30 text-orange font-bold text-xs hover:bg-orange/5 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    Remover foto (Usar iniciais)
                  </button>
                )}
              </>
            )}

            {/* Botão de Confirmação da Alteração */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-cream/5 mt-4">
              <button
                type="button"
                onClick={() => {
                  if (customImageRaw) {
                    setCustomImageRaw(null);
                    setTempAvatarKey(user?.avatar_key ?? null);
                  } else {
                    handleCloseModal();
                  }
                }}
                disabled={dataLoading}
                className="py-3.5 rounded-xl border border-cream/10 text-cream-muted text-xs font-semibold hover:text-cream transition-colors"
              >
                {customImageRaw ? "Voltar" : "Cancelar"}
              </button>

              <button
                type="button"
                onClick={handleConfirmAvatar}
                disabled={dataLoading}
                className="py-3.5 rounded-xl bg-orange text-white text-xs font-bold transition-all active:scale-[0.98] shadow-lg shadow-orange/10 flex items-center justify-center gap-1.5"
              >
                {dataLoading && <Loader2 size={14} className="animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Moeda Não Disponível */}
      {currencyError && (
        <div className="fixed bottom-6 left-4 right-4 z-50 bg-orange text-white px-4 py-3.5 rounded-2xl shadow-xl flex items-center justify-center gap-2 animate-in slide-in-from-bottom duration-300">
          <span className="text-xs font-bold text-center">{currencyError}</span>
        </div>
      )}

    </div>
  );
}

// ─── Funções de Validação e Máscara auxiliares ───────────────────────────────

function validatePhone(phoneRaw: string): boolean {
  const cleanPhone = phoneRaw.replace(/\D/g, "");
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}

function validateAge(birthDateStr: string): boolean {
  if (!birthDateStr) return false;
  const today = new Date();
  const birthDate = new Date(birthDateStr);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 14;
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function validatePassword(pwd: string): string[] {
  const errors: string[] = [];
  if (pwd.length < 6) errors.push("Mínimo 6 caracteres");
  if (!/[A-Z]/.test(pwd)) errors.push("1 letra maiúscula (A–Z)");
  if (!/[0-9]/.test(pwd)) errors.push("1 número (0–9)");
  if (!/[^A-Za-z0-9]/.test(pwd)) errors.push("1 caractere especial (!@#$...)");
  return errors;
}
