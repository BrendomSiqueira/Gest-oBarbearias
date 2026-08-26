import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  TrendingUp,
  Settings,
  LogOut,
  Plus,
  CheckCircle2,
  DollarSign,
  Clock,
  Sparkles,
  Trash2,
  BellRing,
  Camera,
  User as UserIcon,
  Check,
  Undo2,
  AlertTriangle,
  Wallet,
  Receipt,
  MessageSquare,
  KeyRound,
  Smartphone,
  ShieldCheck,
  Edit3,
  Save,
  X,
  Send,
  Gift,
  Target,
  Zap,
  Box,
  Minus,
  Search,
  Phone,
  Image as ImageIcon,
  Briefcase,
  ExternalLink,
  Crown,
  Star,
  Eye,
  EyeOff,
  ShoppingCart,
  Link as LinkIcon,
  Megaphone,
  Wand2,
  MessageCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  Beer,
  ArrowUpCircle,
  ArrowDownCircle,
  FileBarChart,
  History,
  Copy,
  PieChart,
  BarChart3,
  Filter,
  Upload,
  Download,
  Database,
  RefreshCw,
  AlertCircle,
  Lock,
  Unlock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

import { Button, Input, Card, Badge } from "./components/UI";
import { StorageService } from "./services/storage";
import { GeminiService } from "./services/gemini";
import {
  Client,
  Service,
  Appointment,
  AppointmentStatus,
  UserSession,
  Tab,
  Material,
  Drink,
  Sale,
} from "./types";
import {
  auth,
  db,
  OperationType,
  handleFirestoreError,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  deleteDoc,
  updateDoc,
  getDocFromServer,
  setSimulatedUser,
} from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  updateEmail,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

interface BalanceAdjustment {
  id: string;
  amount: number;
  reason: string;
  date: string;
}

const DEFAULT_SERVICES: Service[] = [
  { id: "1", name: "Corte Social", price: 35, duration: 30 },
  { id: "2", name: "Degradê Especial", price: 45, duration: 45 },
  { id: "3", name: "Barba Terapia", price: 25, duration: 25 },
  { id: "4", name: "Corte + Barba (Combo)", price: 55, duration: 60 },
  { id: "5", name: "Sobrancelha", price: 15, duration: 15 },
  { id: "6", name: "Pigmentação Cabelo/Barba", price: 30, duration: 30 },
  { id: "7", name: "Selagem Térmica", price: 80, duration: 90 },
  { id: "8", name: "Luzes / Platinado", price: 90, duration: 120 },
];

const DEFAULT_PROFILE_IMG =
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=400&h=400&auto=format&fit=crop";
const CURRENT_VERSION = "1.1.0";

const LogoElite = ({ className = "h-12 w-12" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 flex items-center justify-center">
      <Scissors
        className="text-elite-red-500 animate-scissors-left -translate-x-1"
        size={32}
      />
      <Scissors
        className="text-elite-red-500 animate-scissors-right translate-x-1"
        size={32}
      />
    </div>
  </div>
);

const WoodenMouseSignature = ({ minimal = false }: { minimal?: boolean }) => {
  const url = "https://www.instagram.com/wooden.mouse.tec?igsh=dXpxamc3bzFtYmg3&utm_source=qr";

  if (minimal) {
    return (
      <div className="mt-auto pt-4 border-t border-white/5 flex justify-center pb-2 select-none">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 px-1.5 bg-amber-500/5 rounded-lg border border-amber-500/10 text-[#E1B15F] flex items-center justify-center cursor-pointer hover:bg-amber-500/20 hover:border-amber-500/30 hover:scale-110 active:scale-95 transition-all"
          title="Produzido por Wooden Mouse - Ir para o Instagram"
        >
          <Sparkles size={10} className="animate-pulse" />
        </a>
      </div>
    );
  }

  return (
    <div className="mt-auto pt-4 border-t border-white/5 flex flex-col items-center justify-center text-center pb-2 select-none">
      <p className="text-[7px] font-black tracking-[0.2em] text-slate-600 uppercase leading-none mb-1">
        PRODUZIDO POR
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[#E1B15F] hover:text-amber-400 hover:scale-105 active:scale-95 transition-all duration-250 cursor-pointer"
        title="Ver Instagram da Wooden Mouse"
      >
        <Sparkles size={10} className="text-amber-500 animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-widest text-[#E1B15F] drop-shadow-[0_0_10px_rgba(225,177,95,0.2)]">
          WOODEN MOUSE
        </span>
      </a>
    </div>
  );
};

// Top-level Time Utility Helpers
const timeToMinutes = (t: string | undefined | null): number => {
  if (!t || typeof t !== "string" || !t.includes(":")) return 0;
  const parts = t.trim().split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

const minutesToTime = (min: number): string => {
  const normalized = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

interface BusinessHoursCardProps {
  session: any;
  setSession: React.Dispatch<React.SetStateAction<any>>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const BusinessHoursCard: React.FC<BusinessHoursCardProps> = ({
  session,
  setSession,
  showToast,
}) => {
  const currentHours = session?.businessHours || {
    open: "08:00",
    close: "19:00",
    days: [1, 2, 3, 4, 5, 6],
    intervalStart: null,
    intervalEnd: null,
  };

  const [localHours, setLocalHours] = useState({
    open: currentHours.open || "08:00",
    close: currentHours.close || "19:00",
    days: currentHours.days || [1, 2, 3, 4, 5, 6],
    intervalStart: currentHours.intervalStart || "",
    intervalEnd: currentHours.intervalEnd || "",
  });

  const [hasInterval, setHasInterval] = useState(
    Boolean(currentHours.intervalStart && currentHours.intervalEnd),
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sync with database if session businessHours changes externally
  useEffect(() => {
    if (session?.businessHours) {
      const bh = session.businessHours;
      setLocalHours({
        open: bh.open || "08:00",
        close: bh.close || "19:00",
        days: bh.days || [1, 2, 3, 4, 5, 6],
        intervalStart: bh.intervalStart || "",
        intervalEnd: bh.intervalEnd || "",
      });
      setHasInterval(Boolean(bh.intervalStart && bh.intervalEnd));
    }
  }, [session?.businessHours]);

  const toggleDay = (day: number) => {
    const newDays = localHours.days.includes(day)
      ? localHours.days.filter((d: number) => d !== day)
      : [...localHours.days, day].sort();

    setLocalHours((h) => ({ ...h, days: newDays }));
  };

  const applyIntervalPreset = (start: string, end: string) => {
    setHasInterval(true);
    setLocalHours((h) => ({
      ...h,
      intervalStart: start,
      intervalEnd: end,
    }));
    showToast(`Pausa selecionada: ${start} às ${end}`, "info");
  };

  const toggleInterval = (active: boolean) => {
    setHasInterval(active);
    if (active && (!localHours.intervalStart || !localHours.intervalEnd)) {
      setLocalHours((h) => ({
        ...h,
        intervalStart: "12:00",
        intervalEnd: "13:00",
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalIntervalStart: string | null = null;
      let finalIntervalEnd: string | null = null;

      if (hasInterval) {
        const start = localHours.intervalStart?.trim();
        const end = localHours.intervalEnd?.trim();

        if (!start || !end) {
          showToast("Informe o início e término da pausa de almoço.", "error");
          setIsSaving(false);
          return;
        }

        const startMin = timeToMinutes(start);
        const endMin = timeToMinutes(end);
        const openMin = timeToMinutes(localHours.open || "08:00");
        const closeMin = timeToMinutes(localHours.close || "19:00");

        if (startMin >= endMin) {
          showToast("O início da pausa de almoço deve ser anterior ao término.", "error");
          setIsSaving(false);
          return;
        }

        if (startMin < openMin || endMin > closeMin) {
          showToast("A pausa deve estar dentro do horário de funcionamento da barbearia.", "error");
          setIsSaving(false);
          return;
        }

        finalIntervalStart = start;
        finalIntervalEnd = end;
      }

      const updatedHours = {
        open: localHours.open || "08:00",
        close: localHours.close || "19:00",
        days: localHours.days && localHours.days.length > 0 ? localHours.days : [1, 2, 3, 4, 5, 6],
        intervalStart: finalIntervalStart,
        intervalEnd: finalIntervalEnd,
      };

      setSession((s: any) =>
        s ? { ...s, businessHours: updatedHours } : { businessHours: updatedHours }
      );

      const userId = auth.currentUser?.uid || "offline_demo";
      if (userId) {
        await setDoc(
          doc(db, "users", userId),
          {
            businessHours: updatedHours,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        showToast("Horários e pausa de almoço salvos com sucesso!", "success");
      }
    } catch (err) {
      console.error("Erro ao salvar horários de funcionamento:", err);
      showToast("Erro ao salvar horários de funcionamento.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card title="Horário de Funcionamento & Pausa" icon={<Clock size={16} />}>
      <div className="space-y-6">
        {/* Expediente Principal */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="ABERTURA DA BARBEARIA"
            type="time"
            value={localHours.open}
            onChange={(e) =>
              setLocalHours((h) => ({ ...h, open: e.target.value }))
            }
          />
          <Input
            label="FECHAMENTO DA BARBEARIA"
            type="time"
            value={localHours.close}
            onChange={(e) =>
              setLocalHours((h) => ({ ...h, close: e.target.value }))
            }
          />
        </div>

        {/* Dias de Funcionamento */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              DIAS DE ATENDIMENTO
            </p>
            <span className="text-[9px] text-[#E1B15F] font-black uppercase">
              {localHours.days.length} dias selecionados
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Dom", day: 0 },
              { label: "Seg", day: 1 },
              { label: "Ter", day: 2 },
              { label: "Qua", day: 3 },
              { label: "Qui", day: 4 },
              { label: "Sex", day: 5 },
              { label: "Sáb", day: 6 },
            ].map(({ label, day }) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3.5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer select-none ${
                  localHours.days.includes(day)
                    ? "bg-elite-red-500 text-white shadow-lg shadow-elite-red-500/20 scale-100"
                    : "bg-slate-900 text-slate-500 border border-white/5 hover:border-white/10 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Seção Reforçada de Pausa para Almoço */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl transition-colors ${hasInterval ? "bg-amber-500/20 text-[#E1B15F]" : "bg-slate-800 text-slate-500"}`}>
                <Zap size={15} />
              </div>
              <div>
                <p className="text-[11px] font-black text-white italic uppercase tracking-wider flex items-center gap-2">
                  Pausa para Almoço / Intervalo
                  {hasInterval && (
                    <span className="text-[8px] bg-amber-500/20 text-[#E1B15F] px-2 py-0.5 rounded-full font-extrabold not-italic">
                      BLOQUEIO ATIVO
                    </span>
                  )}
                </p>
                <p className="text-[9px] font-bold text-slate-400 tracking-wide">
                  {hasInterval
                    ? `Bloqueia novos agendamentos das ${localHours.intervalStart || "12:00"} às ${localHours.intervalEnd || "13:00"}`
                    : "Atendimento contínuo sem pausa cadastrada"}
                </p>
              </div>
            </div>

            {/* Alternador de Pausa de Almoço */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => toggleInterval(false)}
                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                  !hasInterval
                    ? "bg-slate-800 text-white font-black shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Sem Pausa
              </button>
              <button
                type="button"
                onClick={() => toggleInterval(true)}
                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                  hasInterval
                    ? "bg-[#E1B15F] text-slate-950 font-black shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Com Pausa
              </button>
            </div>
          </div>

          {/* Configuração dos Horários de Almoço */}
          {hasInterval ? (
            <div className="space-y-4 p-4 bg-slate-950/70 rounded-2xl border border-amber-500/20 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={12} className="text-[#E1B15F]" />
                  Atalhos Rápidos de Horário de Almoço:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { start: "11:30", end: "12:30", label: "11:30 às 12:30" },
                    { start: "12:00", end: "13:00", label: "12:00 às 13:00" },
                    { start: "12:30", end: "13:30", label: "12:30 às 13:30" },
                    { start: "13:00", end: "14:00", label: "13:00 às 14:00" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyIntervalPreset(preset.start, preset.end)}
                      className={`text-[10px] py-2 px-2 rounded-xl font-extrabold transition-all cursor-pointer text-center ${
                        localHours.intervalStart === preset.start && localHours.intervalEnd === preset.end
                          ? "bg-[#E1B15F] text-slate-950 shadow-md scale-[1.02]"
                          : "bg-slate-900 hover:bg-slate-850 text-slate-300 border border-white/5 hover:border-white/10"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Input
                  label="INÍCIO DA PAUSA"
                  type="time"
                  value={localHours.intervalStart || "12:00"}
                  onChange={(e) => {
                    setLocalHours((h) => ({ ...h, intervalStart: e.target.value }));
                    setHasInterval(true);
                  }}
                />
                <Input
                  label="TÉRMINO DA PAUSA"
                  type="time"
                  value={localHours.intervalEnd || "13:00"}
                  onChange={(e) => {
                    setLocalHours((h) => ({ ...h, intervalEnd: e.target.value }));
                    setHasInterval(true);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-950/40 rounded-2xl border border-dashed border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">
                Nenhuma pausa ativa. Clique em "Com Pausa" ou escolha um horário abaixo:
              </span>
              <button
                type="button"
                onClick={() => applyIntervalPreset("12:00", "13:00")}
                className="text-[10px] font-black text-[#E1B15F] hover:underline uppercase tracking-wider cursor-pointer"
              >
                + Pausa 12h às 13h
              </button>
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={handleSave}
          isLoading={isSaving}
          variant="success"
          className="w-full h-12 text-[10px] tracking-widest font-black uppercase flex items-center justify-center gap-2 mt-4 cursor-pointer shadow-lg hover:shadow-emerald-500/20"
        >
          <Save size={15} /> SALVAR EXPEDIENTE & PAUSA
        </Button>
      </div>
    </Card>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">(
    "login",
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [showEmailAuthGuide, setShowEmailAuthGuide] = useState(false);
  const [newLoginName, setNewLoginName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingLoginName, setIsUpdatingLoginName] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>(Tab.Dashboard);
  const [financeSubTab, setFinanceSubTab] = useState<
    "paid" | "pending" | "adjustments"
  >("pending");

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState("");
  const [editingServicePrice, setEditingServicePrice] = useState<number>(0);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [editingDrinkId, setEditingDrinkId] = useState<string | null>(null);
  const [editingDrinkName, setEditingDrinkName] = useState("");
  const [editingDrinkPrice, setEditingDrinkPrice] = useState<number>(0);
  const [editingDrinkStock, setEditingDrinkStock] = useState<number>(0);
  const [drinkFormName, setDrinkFormName] = useState("");
  const [drinkFormPrice, setDrinkFormPrice] = useState("");
  const [drinkFormStock, setDrinkFormStock] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentRequests, setAppointmentRequests] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminInputPassword, setAdminInputPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [marketingMsg, setMarketingMsg] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("");
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReasonText, setRejectReasonText] = useState("");
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reportMonth, setReportMonth] = useState(
    new Date().toISOString().substring(0, 7),
  );

  const [aptClientSearch, setAptClientSearch] = useState("");
  const [selectedAptClient, setSelectedAptClient] = useState<Client | null>(
    null,
  );
  const [showAptResults, setShowAptResults] = useState(false);
  const [aptServiceSearch, setAptServiceSearch] = useState("");
  const [selectedAptService, setSelectedAptService] = useState<Service | null>(
    null,
  );
  const [showAptServiceResults, setShowAptServiceResults] = useState(false);
  const [aptTimeInput, setAptTimeInput] = useState("");
  const [isPricePendingOnComplete, setIsPricePendingOnComplete] = useState(false);
  const [finishingPriceMap, setFinishingPriceMap] = useState<{ [aptId: string]: string }>({});
  const [agendaSearchTerm, setAgendaSearchTerm] = useState("");
  const [finishingAptId, setFinishingAptId] = useState<string | null>(null);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState<string | null>(
    null,
  );
  const [clientPhotoBase64, setClientPhotoBase64] = useState<string | null>(
    null,
  );

  // Estados para edição e duplicidade
  const [pendingClient, setPendingClient] = useState<{
    name: string;
    phone: string;
    photo: string | null;
  } | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editPhotoBase64, setEditPhotoBase64] = useState<string | null>(null);

  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = useMemo(() => {
    if (!auth.currentUser?.email) return false;
    const adminEmails = [
      "brendomsiqueira95@gmail.com",
      "brendomsiqueira96@gmail.com",
      "brendomdev@gmail.com",
      "brendomdev@gmaill.com",
      "admin@barbershop.com",
      "matheus@barbershop.com",
    ];
    return adminEmails.includes(auth.currentUser.email);
  }, [auth.currentUser?.email]);

  // Detect public booking mode
  const barberIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("barberId")?.trim();
  }, []);



  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Test connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("the client is offline")
        ) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // System Config Listener
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSystemConfig(data);
        if (data.version && data.version !== CURRENT_VERSION) {
          setShowUpdateModal(true);
        }
      }
    });
    return () => unsub();
  }, [isAuthenticated]);

  // Admin Listener
  useEffect(() => {
    if (!isAdmin || !isAuthenticated) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setAllUsers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [isAdmin, isAuthenticated]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setSession(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Auto-save Profile Settings
  useEffect(() => {
    if (!isAuthenticated || !auth.currentUser || !session) return;
    const userId = auth.currentUser.uid;

    const timeoutId = setTimeout(async () => {
      try {
        await setDoc(
          doc(db, "users", userId),
          {
            username: session.username || "Matheus Farias",
            shopName: session.shopName || "",
            phone: session.phone || "",
            profileImage: session.profileImage || DEFAULT_PROFILE_IMG,
            monthlyGoal: session.monthlyGoal || 0,
            businessHours: session.businessHours || null,
            unavailableSlots: session.unavailableSlots || [],
            marketing_msg: marketingMsg,
            campaign_goal: campaignGoal,
            privacy_mode: isPrivacyMode,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      } catch (err) {
        console.error("Erro ao salvar perfil automaticamente:", err);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    session?.username,
    session?.shopName,
    session?.phone,
    session?.profileImage,
    session?.monthlyGoal,
    session?.businessHours,
    session?.unavailableSlots,
    marketingMsg,
    campaignGoal,
    isPrivacyMode,
    isAuthenticated,
  ]);

  // Data Listeners
  useEffect(() => {
    if (!isAuthenticated || !auth.currentUser) return;

    const userId = auth.currentUser.uid;

    const unsubProfile = onSnapshot(
      doc(db, "users", userId),
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSession({
            username: data.username,
            shopName: data.shopName,
            phone: data.phone,
            profileImage: data.profileImage,
            monthlyGoal: data.monthlyGoal,
            businessHours: data.businessHours || undefined,
            unavailableSlots: data.unavailableSlots || [],
          });
          setMarketingMsg(data.marketing_msg || "");
          setCampaignGoal(data.campaign_goal || "");
          setIsPrivacyMode(data.privacy_mode || false);

          // Auto-migrate if not done yet
          if (!data.migrated) {
            migrateLocalData(userId, data.username).then((migrated) => {
              if (migrated) {
                showToast("Dados locais sincronizados com sucesso!", "info");
              }
            });
          }

          // Sync any offline modifications up to Firestore once online
          if (localStorage.getItem("force_offline") !== "true" && localStorage.getItem("simdb_has_local_changes") === "true") {
            syncLocalToCloud(userId);
          }
        } else {
          try {
            await setDoc(doc(db, "users", userId), {
              username: "Matheus Farias",
              shopName: "Barbearia Matheus Farias",
              phone: "",
              profileImage: DEFAULT_PROFILE_IMG,
              monthlyGoal: 5000,
              marketing_msg: "",
              campaign_goal: "",
              privacy_mode: false,
              migrated: true,
            });
          } catch (err) {
            console.error("Erro ao inicializar perfil de usuário:", err);
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}`),
    );

    const unsubClients = onSnapshot(
      collection(db, "users", userId, "clients"),
      (snap) => {
        setClients(snap.docs.map((d) => d.data() as Client));
      },
      (err) =>
        handleFirestoreError(err, OperationType.GET, `users/${userId}/clients`),
    );

    const unsubServices = onSnapshot(
      collection(db, "users", userId, "services"),
      (snap) => {
        const data = snap.docs.map((d) => d.data() as Service);
        setServices(data.length > 0 ? data : DEFAULT_SERVICES);
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          `users/${userId}/services`,
        ),
    );

    const unsubAppointments = onSnapshot(
      collection(db, "users", userId, "appointments"),
      (snap) => {
        setAppointments(snap.docs.map((d) => d.data() as Appointment));
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          `users/${userId}/appointments`,
        ),
    );

    const unsubMaterials = onSnapshot(
      collection(db, "users", userId, "materials"),
      (snap) => {
        setMaterials(snap.docs.map((d) => d.data() as Material));
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          `users/${userId}/materials`,
        ),
    );

    const unsubDrinks = onSnapshot(
      collection(db, "users", userId, "drinks"),
      (snap) => {
        setDrinks(snap.docs.map((d) => d.data() as Drink));
      },
      (err) =>
        handleFirestoreError(err, OperationType.GET, `users/${userId}/drinks`),
    );

    const unsubSales = onSnapshot(
      collection(db, "users", userId, "sales"),
      (snap) => {
        setSales(snap.docs.map((d) => d.data() as Sale));
      },
      (err) =>
        handleFirestoreError(err, OperationType.GET, `users/${userId}/sales`),
    );

    const unsubAdjustments = onSnapshot(
      collection(db, "users", userId, "adjustments"),
      (snap) => {
        setAdjustments(snap.docs.map((d) => d.data() as BalanceAdjustment));
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          `users/${userId}/adjustments`,
        ),
    );

    const unsubNotifications = onSnapshot(
      collection(db, "users", userId, "notifications"),
      (snap) => {
        setNotifications(
          snap.docs
            .map((d) => d.data())
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            ),
        );
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          `users/${userId}/notifications`,
        ),
    );

    const unsubRequests = onSnapshot(
      collection(db, "users", userId, "requests"),
      (snap) => {
        setAppointmentRequests(
          snap.docs
            .map((d) => d.data())
            .filter((r) => r.status === "pending")
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            ),
        );
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          `users/${userId}/requests`,
        ),
    );

    return () => {
      unsubProfile();
      unsubClients();
      unsubServices();
      unsubAppointments();
      unsubMaterials();
      unsubDrinks();
      unsubSales();
      unsubAdjustments();
      unsubNotifications();
      unsubRequests();
    };
  }, [isAuthenticated, auth.currentUser]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const monthPrefix = today.substring(0, 7);
    const yearPrefix = today.substring(0, 4);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const compApts = appointments.filter((a) => a.completed);

    const serviceMonthlyRev = compApts
      .filter((a) => a.date.startsWith(monthPrefix) && a.paid)
      .reduce((acc, a) => acc + Number(a.finalPrice || 0), 0);
    const salesMonthlyRev = sales
      .filter((s) => s.date.startsWith(monthPrefix))
      .reduce((acc, s) => acc + Number(s.price || 0), 0);
    const adjustmentsMonthly = adjustments
      .filter((a) => a.date.startsWith(monthPrefix))
      .reduce((acc, a) => acc + Number(a.amount || 0), 0);
    const monthlyRevTotal =
      serviceMonthlyRev + salesMonthlyRev + adjustmentsMonthly;

    const chartData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const day = d.getDate().toString().padStart(2, "0");
      const ds = `${year}-${month}-${day}`;
      const rev =
        compApts
          .filter((a) => a.date === ds && a.paid)
          .reduce((acc, a) => acc + Number(a.finalPrice || 0), 0) +
        sales
          .filter((s) => s.date === ds)
          .reduce((acc, s) => acc + Number(s.price || 0), 0) +
        adjustments
          .filter((a) => a.date === ds)
          .reduce((acc, a) => acc + Number(a.amount || 0), 0);
      return {
        name: d.toLocaleDateString("pt-BR", { weekday: "short" }),
        receita: Math.max(0, rev),
      };
    });

    const monthlyReportData = Array.from({ length: 12 }, (_, i) => {
      const monthStr = `${yearPrefix}-${(i + 1).toString().padStart(2, "0")}`;
      const count = compApts.filter((a) => a.date.startsWith(monthStr)).length;
      return {
        month: new Date(parseInt(yearPrefix), i, 1)
          .toLocaleString("pt-BR", { month: "short" })
          .toUpperCase(),
        count: count,
      };
    });

    return {
      dailyRev:
        compApts
          .filter((a) => a.date === today && a.paid)
          .reduce((acc, a) => acc + Number(a.finalPrice || 0), 0) +
        sales
          .filter((s) => s.date === today)
          .reduce((acc, s) => acc + Number(s.price || 0), 0) +
        adjustments
          .filter((a) => a.date === today)
          .reduce((acc, a) => acc + Number(a.amount || 0), 0),
      monthlyRev: monthlyRevTotal,
      todayCuts: compApts.filter((a) => a.date === today).length,
      weekCuts: compApts.filter((a) => new Date(a.date) >= sevenDaysAgo).length,
      monthlyCuts: compApts.filter((a) => a.date.startsWith(monthPrefix))
        .length,
      yearlyCuts: compApts.filter((a) => a.date.startsWith(yearPrefix)).length,
      reportCuts: compApts.filter((a) => a.date.startsWith(reportMonth)).length,
      reportRevenue:
        compApts
          .filter((a) => a.date.startsWith(reportMonth) && a.paid)
          .reduce((acc, a) => acc + Number(a.finalPrice || 0), 0) +
        sales
          .filter((s) => s.date.startsWith(reportMonth))
          .reduce((acc, s) => acc + Number(s.price || 0), 0) +
        adjustments
          .filter((a) => a.date.startsWith(reportMonth))
          .reduce((acc, a) => acc + Number(a.amount || 0), 0),
      goalPercent: Math.min(
        Math.round((monthlyRevTotal / (session?.monthlyGoal || 5000)) * 100),
        100,
      ),
      chartData,
      monthlyReportData,
    };
  }, [appointments, sales, adjustments, session?.monthlyGoal, reportMonth]);

  const handleExportData = () => {
    if (!session) return;
    const data = {
      clients,
      services,
      materials,
      drinks,
      appointments,
      adjustments,
      sales,
      marketing_msg: session.marketing_msg,
      campaign_goal: session.campaign_goal,
      monthlyGoal: session.monthlyGoal,
      shopName: session.shopName,
      phone: session.phone,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_barber_mf_${session.shopName.replace(/\s+/g, "_").toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Backup exportado com sucesso!");
  };

  const handleExportExcelYear = () => {
    if (!session) return;
    const selectedYear = reportMonth.split("-")[0];

    const formatBRLDecimal = (num: number) => {
      return num.toFixed(2).replace(".", ",");
    };

    const compApts = appointments.filter(
      (a) => a.completed && a.date.startsWith(selectedYear),
    );
    const yearSales = sales.filter((s) => s.date.startsWith(selectedYear));
    const yearAdjustments = adjustments.filter((a) =>
      a.date.startsWith(selectedYear),
    );

    // Calc overall totals
    const servicesTotal = compApts
      .filter((a) => a.paid)
      .reduce((acc, a) => acc + Number(a.finalPrice || 0), 0);
    const salesTotal = yearSales.reduce((acc, s) => acc + Number(s.price || 0), 0);
    const adjustmentsTotal = yearAdjustments.reduce(
      (acc, a) => acc + Number(a.amount || 0),
      0,
    );
    const grandTotal = servicesTotal + salesTotal + adjustmentsTotal;

    const csvLines: string[] = [];

    // Header
    csvLines.push(`RELATÓRIO DE DESEMPENHO ANUAL - BARBEARIA MATHEUS FARIAS`);
    csvLines.push(`Ano de Referência:;${selectedYear}`);
    csvLines.push(
      `Gerado em:;${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
    );
    csvLines.push(``);

    // Section 1: Summary Cards
    csvLines.push(`*** RESUMO FINANCEIRO ANUAL ***`);
    csvLines.push(`Indicador;Valor (R$)`);
    csvLines.push(`Faturamento de Serviços;${formatBRLDecimal(servicesTotal)}`);
    csvLines.push(`Vendas de Produtos;${formatBRLDecimal(salesTotal)}`);
    csvLines.push(`Ajustes de Caixa;${formatBRLDecimal(adjustmentsTotal)}`);
    csvLines.push(
      `FATURAMENTO REAL TOTAL COMBINADO;${formatBRLDecimal(grandTotal)}`,
    );
    csvLines.push(`Total de Cortes Concluídos;${compApts.length}`);
    csvLines.push(``);

    // Section 2: Month-by-month
    csvLines.push(`*** DESEMPENHO MENSAL EM ${selectedYear} ***`);
    csvLines.push(
      `Mês;Cortes Realizados;Serviços (R$);Vendas (R$);Ajustes (R$);Total Mensal (R$)`,
    );

    const monthsNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];

    monthsNames.forEach((monthName, idx) => {
      const monthPrefix = `${selectedYear}-${(idx + 1).toString().padStart(2, "0")}`;
      const mCuts = compApts.filter((a) => a.date.startsWith(monthPrefix));
      const mServices = mCuts
        .filter((a) => a.paid)
        .reduce((acc, a) => acc + Number(a.finalPrice || 0), 0);
      const mSales = yearSales
        .filter((s) => s.date.startsWith(monthPrefix))
        .reduce((acc, s) => acc + Number(s.price || 0), 0);
      const mAdjustments = yearAdjustments
        .filter((a) => a.date.startsWith(monthPrefix))
        .reduce((acc, a) => acc + Number(a.amount || 0), 0);
      const mTotal = mServices + mSales + mAdjustments;

      csvLines.push(
        `${monthName};${mCuts.length};${formatBRLDecimal(mServices)};${formatBRLDecimal(mSales)};${formatBRLDecimal(mAdjustments)};${formatBRLDecimal(mTotal)}`,
      );
    });
    csvLines.push(``);

    // Section 3: Appointment details
    csvLines.push(`*** DETALHAMENTO DE ATENDIMENTOS NO ANO ***`);
    csvLines.push(
      `Data;Horário;Cliente;Telefone;Serviço;Valor Original (R$);Desconto/Acréscimo (R$);Pago (R$);Status de Pagamento`,
    );

    compApts
      .sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      )
      .forEach((apt) => {
        // Find client/service names
        const serviceName =
          services.find((s) => s.id === apt.serviceId)?.name ||
          "Serviço Não Identificado";
        const originalPrice =
          services.find((s) => s.id === apt.serviceId)?.price || apt.finalPrice;
        const clientName =
          clients.find((c) => c.id === apt.clientId)?.name ||
          apt.clientName ||
          "Cliente Avulso";
        const clientPhone =
          clients.find((c) => c.id === apt.clientId)?.phone ||
          apt.clientPhone ||
          "-";

        const formattedDate = apt.date.split("-").reverse().join("/");
        const diff = apt.finalPrice - originalPrice;
        const diffStr = diff === 0 ? "0,00" : formatBRLDecimal(diff);

        csvLines.push(
          `${formattedDate};${apt.time};${clientName?.replace(/;/g, ",")};${clientPhone?.replace(/;/g, ",")};${serviceName?.replace(/;/g, ",")};${formatBRLDecimal(originalPrice)};${diffStr};${formatBRLDecimal(apt.finalPrice)};${apt.paid ? "PAGO" : "PENDENTE"}`,
        );
      });
    csvLines.push(``);

    // Section 4: Sales list
    csvLines.push(`*** DETALHAMENTO DE VENDAS DE PRODUTOS NO ANO ***`);
    csvLines.push(`Data;Produto/Item;Valor (R$)`);

    yearSales
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((sale) => {
        const formattedDate = sale.date.includes("T")
          ? sale.date.split("T")[0].split("-").reverse().join("/")
          : sale.date.split("-").reverse().join("/");
        csvLines.push(
          `${formattedDate};${sale.itemName?.replace(/;/g, ",")};${formatBRLDecimal(sale.price)}`,
        );
      });
    csvLines.push(``);

    // Section 5: Adjustments list
    csvLines.push(`*** DETALHAMENTO DE AJUSTES DE CAIXA NO ANO ***`);
    csvLines.push(`Data;Descrição do Ajuste;Valor do Ajuste (R$);Tipo`);

    yearAdjustments
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((adj) => {
        const formattedDate = adj.date.split("-").reverse().join("/");
        const type = adj.amount >= 0 ? "ENTRADA" : "SAÍDA";
        csvLines.push(
          `${formattedDate};${adj.reason?.replace(/;/g, ",")};${formatBRLDecimal(adj.amount)};${type}`,
        );
      });

    // Generate CSV content with UTF-8 BOM
    const csvContent = "\uFEFF" + csvLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Relatorio_Anual_MF_${selectedYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Relatório Excel do ano ${selectedYear} exportado com sucesso!`);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        showToast("Restaurando backup na nuvem...");

        const collections = [
          "clients",
          "services",
          "materials",
          "drinks",
          "appointments",
          "adjustments",
          "sales",
        ];
        for (const col of collections) {
          if (data[col] && Array.isArray(data[col])) {
            for (const item of data[col]) {
              await setDoc(doc(db, "users", userId, col, item.id), item);
            }
          }
        }

        // Update profile settings if present
        const profileUpdates: any = {};
        if (data.marketing_msg !== undefined)
          profileUpdates.marketing_msg = data.marketing_msg;
        if (data.campaign_goal !== undefined)
          profileUpdates.campaign_goal = data.campaign_goal;
        if (data.monthlyGoal !== undefined)
          profileUpdates.monthlyGoal = data.monthlyGoal;
        if (data.shopName !== undefined)
          profileUpdates.shopName = data.shopName;
        if (data.phone !== undefined) profileUpdates.phone = data.phone;

        if (Object.keys(profileUpdates).length > 0) {
          await updateDoc(doc(db, "users", userId), profileUpdates);
        }

        showToast("Backup restaurado com sucesso!");
      } catch (err) {
        console.error("Erro na importação:", err);
        showToast("Erro ao processar arquivo de backup!", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteDrink = async (e: React.MouseEvent, drinkId: string) => {
    e.stopPropagation();
    if (confirm("Deseja realmente remover este item do bar?")) {
      if (!auth.currentUser) return;
      try {
        await deleteDoc(
          doc(db, "users", auth.currentUser.uid, "drinks", drinkId),
        );
        showToast("Item removido do bar!");
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `users/${auth.currentUser.uid}/drinks/${drinkId}`,
        );
      }
    }
  };

  const handleDeleteMaterial = async (
    e: React.MouseEvent,
    materialId: string,
  ) => {
    e.stopPropagation();
    if (confirm("Deseja excluir este insumo permanentemente do estoque?")) {
      if (!auth.currentUser) return;
      try {
        await deleteDoc(
          doc(db, "users", auth.currentUser.uid, "materials", materialId),
        );
        showToast("Insumo removido do estoque!");
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `users/${auth.currentUser.uid}/materials/${materialId}`,
        );
      }
    }
  };

  const sendReminder = async (aptId: string) => {
    const apt = appointments.find((a) => a.id === aptId);
    if (!apt) return;
    const client = clients.find((c) => c.id === apt.clientId);
    const service = services.find((s) => s.id === apt.serviceId);
    if (!client || !service) return;
    setIsSendingReminder(aptId);
    try {
      const msg = await GeminiService.generateBusinessMessage(
        "reminder",
        client.name,
        service.name,
        apt.time,
      );
      window.open(
        `https://wa.me/55${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
        "_blank",
      );
      showToast("Lembrete gerado com IA!");
    } catch (error) {
      showToast("Erro ao gerar lembrete", "error");
    } finally {
      setIsSendingReminder(null);
    }
  };

  const toggleCompleteFlow = async (id: string, paidStatus: boolean, customPrice?: number) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const apt = appointments.find((a) => a.id === id);
    if (!apt) return;

    const finalAmount = customPrice !== undefined && !isNaN(customPrice)
      ? customPrice
      : (apt.finalPrice || 0);

    try {
      await updateDoc(doc(db, "users", userId, "appointments", id), {
        completed: true,
        paid: paidStatus,
        finalPrice: finalAmount,
        pricePending: false,
      });

      if (paidStatus && finalAmount > 0) {
        const client = clients.find((c) => c.id === apt.clientId);
        if (client) {
          await updateDoc(doc(db, "users", userId, "clients", client.id), {
            totalSpent: (client.totalSpent || 0) + finalAmount,
            lastVisit: new Date().toISOString(),
          });
        }
      }

      setFinishingAptId(null);
      showToast(
        paidStatus
          ? `Atendimento concluído! R$ ${finalAmount.toFixed(2)} recebido.`
          : `Atendimento finalizado em débito (R$ ${finalAmount.toFixed(2)} pendente).`,
        "success"
      );
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${userId}/appointments/${id}`,
      );
    }
  };

  const sellDrink = async (drink: Drink) => {
    if (drink.stock <= 0) return showToast("Sem estoque!", "error");
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const saleId = Date.now().toString();

    try {
      await setDoc(doc(db, "users", userId, "sales", saleId), {
        id: saleId,
        itemId: drink.id,
        itemName: drink.name,
        price: drink.price,
        date: new Date().toISOString().split("T")[0],
      });

      await updateDoc(doc(db, "users", userId, "drinks", drink.id), {
        stock: drink.stock - 1,
      });

      showToast(`${drink.name} vendida!`);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${userId}/sales/${saleId}`,
      );
    }
  };

  const formatCurrency = (v: number) =>
    isPrivacyMode
      ? "••••"
      : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const migrateLocalData = async (userId: string, username: string) => {
    const collections = [
      "clients",
      "services",
      "materials",
      "drinks",
      "appointments",
      "adjustments",
      "sales",
    ];
    let migratedAny = false;

    for (const col of collections) {
      const localData = StorageService.get<any[]>(`${username}_${col}`);
      if (localData && Array.isArray(localData)) {
        migratedAny = true;
        for (const item of localData) {
          try {
            await setDoc(doc(db, "users", userId, col, item.id), item);
          } catch (err) {
            console.error(`Error migrating ${col} item ${item.id}:`, err);
          }
        }
      }
    }

    // Also migrate marketing and campaign data
    const marketingMsg = StorageService.get<string>(
      `${username}_marketing_msg`,
    );
    const campaignGoal = StorageService.get<string>(
      `${username}_campaign_goal`,
    );

    if (marketingMsg || campaignGoal) {
      migratedAny = true;
      try {
        await updateDoc(doc(db, "users", userId), {
          marketing_msg: marketingMsg || "",
          campaign_goal: campaignGoal || "",
        });
      } catch (err) {
        console.error("Error migrating profile settings:", err);
      }
    }

    // Mark as migrated in Firestore
    try {
      await updateDoc(doc(db, "users", userId), {
        migrated: true,
      });
    } catch (err) {
      console.error("Error marking as migrated:", err);
    }

    return migratedAny;
  };

  const syncLocalToCloud = async (userId: string) => {
    if ((window as any).isSyncingData) return;
    (window as any).isSyncingData = true;

    try {
      console.log("Reconciling local offline changes to Firestore...");
      const collectionsToSync = [
        "clients",
        "services",
        "appointments",
        "materials",
        "drinks",
        "sales",
        "adjustments",
        "notifications",
        "requests",
      ];

      let syncCount = 0;

      for (const col of collectionsToSync) {
        const rawLocal = localStorage.getItem(`simdb_users_${userId}_${col}`);
        if (rawLocal) {
          try {
            const items = JSON.parse(rawLocal);
            if (Array.isArray(items)) {
              for (const item of items) {
                if (item && item.id) {
                  // Write standardly to both Firestore and local simulation
                  await setDoc(doc(db, "users", userId, col, item.id), item);
                  syncCount++;
                }
              }
            }
          } catch (err) {
            console.error(`Error parsing or syncing collection ${col}:`, err);
          }
        }
      }

      // Process pending deletions made while offline
      const rawDeletions = localStorage.getItem("simdb_pending_deletions");
      if (rawDeletions) {
        try {
          const pathsToDelete = JSON.parse(rawDeletions);
          if (Array.isArray(pathsToDelete)) {
            for (const path of pathsToDelete) {
              const segments = path.split("/");
              // Delete standardly from both
              await deleteDoc(doc(db, ...segments));
            }
          }
        } catch (err) {
          console.error("Error processing pending deletions:", err);
        }
        localStorage.removeItem("simdb_pending_deletions");
      }

      // Sync user profile settings
      const rawUser = localStorage.getItem(`simdb_user_${userId}`);
      if (rawUser) {
        try {
          const userData = JSON.parse(rawUser);
          await setDoc(doc(db, "users", userId), userData, { merge: true });
        } catch (err) {
          console.error("Error syncing user profile offline settings:", err);
        }
      }

      localStorage.removeItem("simdb_has_local_changes");
      console.log(`Synchronization complete! Reconciled ${syncCount} items down to cloud database.`);
      showToast("Alterações offline sincronizadas com o servidor físico!", "success");
    } catch (err) {
      console.error("Critical error during cloud data reconciliation:", err);
    } finally {
      (window as any).isSyncingData = false;
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists, if not create it
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          username: user.displayName || user.email?.split("@")[0] || "Barbeiro",
          shopName: "Minha Barbearia",
          phone: "",
          profileImage: user.photoURL || DEFAULT_PROFILE_IMG,
          monthlyGoal: 5000,
          marketing_msg: "",
          campaign_goal: "",
          privacy_mode: false,
        });
      }
      showToast("Bem-vindo!");
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === "auth/account-exists-with-different-credential") {
        setAuthError(
          "Já existe uma conta com este e-mail usando senha. Entre com seu e-mail e senha primeiro e depois vincule o Google nas configurações do perfil.",
        );
      } else if (
        err.code?.includes("api-key-not-valid") ||
        err.message?.includes("api-key-not-valid") ||
        err.code === "auth/api-key-not-valid"
      ) {
        setAuthError(
          "Erro de Chave de API: O Firebase acabou de ser provisionado e a chave de API leva de 2 a 5 minutos para se propagar nos servidores globais do Google. Por favor, aguarde alguns instantes e faça uma atualização forçada da página (Ctrl+Shift+R ou Cmd+Shift+R) para renovar a conexão.",
        );
      } else {
        setAuthError(
          `Erro ao entrar com Google: ${err.code || "Erro desconhecido"}`,
        );
      }
    }
  };

  const handleOfflineLogin = () => {
    setSimulatedUser({
      uid: "offline_demo",
      email: "admin@barbershop.com",
      displayName: "Matheus Farias (Modo Admin Local)",
    });
    setAuthError(null);
    setShowEmailAuthGuide(false);
    showToast("Acessando com o Modo Demonstrativo Local!", "info");
  };

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) return;
    const provider = new GoogleAuthProvider();
    try {
      await linkWithPopup(auth.currentUser, provider);
      showToast("Conta Google vinculada com sucesso!");
      // Force a refresh of the session data if needed, but onSnapshot should handle it
    } catch (err: any) {
      console.error("Link Error:", err);
      if (err.code === "auth/credential-already-in-use") {
        showToast(
          "Esta conta Google já está vinculada a outro usuário.",
          "error",
        );
      } else {
        showToast("Erro ao vincular conta Google.", "error");
      }
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(
        doc(db, "users", auth.currentUser.uid, "notifications", id),
        {
          read: true,
        },
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!auth.currentUser) return;
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      await markNotificationAsRead(n.id);
    }
    showToast("Todas as notificações lidas!");
  };

  const BookingRequestListView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
          <Smartphone size={24} className="text-elite-red-500" />
          Solicitações Pendentes
        </h2>
        <Badge className="bg-elite-red-500 text-white font-extrabold">{appointmentRequests.length}</Badge>
      </div>

      {appointmentRequests.length === 0 ? (
        <Card className="glass-card p-12 text-center border-dashed border-slate-800">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-800">
              <CheckCircle2 className="text-emerald-500" size={32} />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              Tudo em dia! Nenhuma solicitação pendente.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {appointmentRequests.map((req) => {
            const service = services.find((s) => s.id === req.serviceId);
            const isProcessing = processingRequestId === req.id;
            return (
              <Card
                key={req.id}
                className="glass-card p-4 hover:border-elite-cyan-500/50 transition-colors group relative overflow-hidden"
              >
                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex items-center justify-center gap-2">
                    <RefreshCw size={18} className="animate-spin text-elite-cyan-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white">Processando...</span>
                  </div>
                )}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-elite-red-500/20 rounded-xl flex items-center justify-center border border-elite-red-500/30 shrink-0">
                      <UserIcon className="text-elite-red-500" size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-white italic uppercase">
                        {req.clientName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-bold uppercase mt-1">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Phone size={11} className="text-slate-500" /> {req.clientPhone}
                        </span>
                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                        <span className="flex items-center gap-1 text-elite-cyan-400">
                          <Scissors size={11} /> {service?.name || "Serviço"} • R$ {service?.price || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-5">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        {req.date ? req.date.split("-").reverse().join("/") : ""}
                      </p>
                      <p className="text-xl font-black text-elite-cyan-400 italic leading-none mt-0.5">
                        {req.time}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => {
                          setRejectingRequestId(req.id);
                          setRejectReasonText("");
                          setShowRejectModal(true);
                        }}
                        className="px-3.5 py-3 bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 rounded-xl border border-red-500/20 transition-all cursor-pointer flex items-center gap-1.5 font-bold text-xs disabled:opacity-50"
                        title="Recusar Horário"
                      >
                        <X size={16} />
                        <span className="hidden sm:inline text-[10px] font-black uppercase">Recusar</span>
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRequestAction(req.id, "accept")}
                        className="px-4 py-3 bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-400 rounded-xl border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5 font-bold text-xs disabled:opacity-50 shadow-sm hover:shadow-emerald-500/10"
                        title="Aceitar e Confirmar"
                      >
                        <Check size={16} />
                        <span className="hidden sm:inline text-[10px] font-black uppercase">Aceitar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
  const [selectedBookingDate, setSelectedBookingDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const generateTimeSlots = (
    date: string,
    open: string,
    close: string,
    intervalStart: string | undefined | null,
    intervalEnd: string | undefined | null,
    serviceDuration: number = 30,
  ) => {
    const slots: string[] = [];
    const openMin = timeToMinutes(open || "08:00");
    let closeMin = timeToMinutes(close || "19:00");
    if (closeMin <= openMin) {
      closeMin += 24 * 60; // closes after midnight
    }

    const hasInt = Boolean(
      intervalStart &&
      intervalEnd &&
      intervalStart.trim() &&
      intervalEnd.trim() &&
      intervalStart.trim() !== intervalEnd.trim()
    );

    const intStartMin = hasInt ? timeToMinutes(intervalStart) : -1;
    const intEndMin = hasInt ? timeToMinutes(intervalEnd) : -1;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const nowMin = now.getHours() * 60 + now.getMinutes() + 30; // 30 min minimum notice for today

    for (let currentMin = openMin; currentMin < closeMin; currentMin += 30) {
      const slotTimeStr = minutesToTime(currentMin);
      const slotEndMin = currentMin + (serviceDuration || 30);

      // Check if slot overlaps with lunch break interval
      let isInterval = false;
      if (hasInt) {
        if (intStartMin < intEndMin) {
          // Standard daytime interval, e.g. 12:00 to 13:00
          // Overlap: slot starts before interval ends AND finishes after interval starts
          isInterval = currentMin < intEndMin && slotEndMin > intStartMin;
        } else {
          // Overnight interval
          isInterval = currentMin >= intStartMin || slotEndMin <= intEndMin;
        }
      }

      const isTooSoon = date === todayStr && currentMin < nowMin;

      if (!isInterval && !isTooSoon) {
        slots.push(slotTimeStr);
      }
    }
    return slots;
  };

  const getAvailableSlots = (date: string, service: Service | null) => {
    if (!session?.businessHours) return [];
    const dayOfWeek = new Date(date + "T12:00:00").getDay();
    if (!session.businessHours.days.includes(dayOfWeek)) return [];

    // Check if whole day is unavailable (has no specific time)
    if (session.unavailableSlots?.some((u) => u.date === date && !u.time)) return [];

    const duration = service?.duration || 30;

    const allSlots = generateTimeSlots(
      date,
      session.businessHours.open,
      session.businessHours.close,
      session.businessHours.intervalStart,
      session.businessHours.intervalEnd,
      duration,
    );

    // Filter occupied slots
    return allSlots.filter((time) => {
      // Check if slot itself is blocked
      const isBlockedSlot = session.unavailableSlots?.some(
        (u) => u.date === date && u.time === time,
      );
      if (isBlockedSlot) return false;

      // Check appointments
      const isAptCollision = appointments.some((a) => {
        if (a.date !== date || a.status === AppointmentStatus.Rejected) return false;
        
        const existingService = services.find((s) => s.id === a.serviceId);
        const aDuration = existingService?.duration || 30;
        
        const aStart = timeToMinutes(a.time);
        const aEnd = aStart + aDuration;
        
        const slotStart = timeToMinutes(time);
        const slotEnd = slotStart + duration;
        
        return slotStart < aEnd && aStart < slotEnd;
      });

      // Check pending requests
      const isReqCollision = appointmentRequests.some((r) => {
        if (r.date !== date || r.status !== "pending") return false;
        
        const requestedService = services.find((s) => s.id === r.serviceId);
        const rDuration = requestedService?.duration || 30;
        
        const rStart = timeToMinutes(r.time);
        const rEnd = rStart + rDuration;
        
        const slotStart = timeToMinutes(time);
        const slotEnd = slotStart + duration;
        
        return slotStart < rEnd && rStart < slotEnd;
      });

      return !isAptCollision && !isReqCollision;
    });
  };

  const sendWhatsAppNotification = (phone: string, message: string) => {
    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
      const w = window.open(url, "_blank");
      if (!w) {
        console.warn("Popup blocked for WhatsApp redirect.");
      }
    } catch (e) {
      console.error("WhatsApp notification error:", e);
    }
  };

  const OnlineBookingView = () => {
    const isDayOff = session?.unavailableSlots?.some(
      (u) => u.date === selectedBookingDate && !u.time,
    );

    const toggleDayOff = async () => {
      if (!session) return;
      const userId = auth.currentUser?.uid;
      const newSlots = isDayOff
        ? (session.unavailableSlots || []).filter(
            (u) => !(u.date === selectedBookingDate && !u.time),
          )
        : [
            ...(session.unavailableSlots || []).filter(
              (u) => u.date !== selectedBookingDate,
            ),
            { date: selectedBookingDate },
          ];

      setSession({ ...session, unavailableSlots: newSlots });
      if (userId) {
        try {
          await updateDoc(doc(db, "users", userId), {
            unavailableSlots: newSlots,
          });
        } catch (err) {
          console.error("Erro ao salvar folga:", err);
          showToast("Erro ao sincronizar folga com o banco de dados.", "error");
        }
      }
      showToast(isDayOff ? "Dia liberado!" : "Dia marcado como indisponível.");
    };

    const blockHours = session?.businessHours || {
      open: "08:00",
      close: "19:00",
      days: [1, 2, 3, 4, 5, 6],
    };

    const slotsForBlocking = generateTimeSlots(
      selectedBookingDate,
      blockHours.open,
      blockHours.close,
      blockHours.intervalStart || undefined,
      blockHours.intervalEnd || undefined,
    );

    const toggleSlotBlock = async (slotTime: string) => {
      if (!session) return;
      const userId = auth.currentUser?.uid;
      const currentSlots = session.unavailableSlots || [];
      const isBlocked = currentSlots.some(
        (u) => u.date === selectedBookingDate && u.time === slotTime,
      );

      let newSlots;
      if (isBlocked) {
        newSlots = currentSlots.filter(
          (u) => !(u.date === selectedBookingDate && u.time === slotTime),
        );
      } else {
        newSlots = [...currentSlots, { date: selectedBookingDate, time: slotTime }];
      }

      setSession({ ...session, unavailableSlots: newSlots });
      if (userId) {
        try {
          await updateDoc(doc(db, "users", userId), {
            unavailableSlots: newSlots,
          });
        } catch (err) {
          console.error("Erro ao salvar bloqueio de horário:", err);
          showToast("Erro ao sincronizar bloqueio de horário.", "error");
        }
      }
      showToast(
        isBlocked
          ? `Horário das ${slotTime} liberado!`
          : `Horário das ${slotTime} bloqueado!`,
      );
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
              Gestão de Agendamentos
            </h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={12} className="text-emerald-500" />
              Sua agenda online está ativa
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={selectedBookingDate}
              onChange={(e) => setSelectedBookingDate(e.target.value)}
              className="w-40 h-10 text-[10px]"
            />
            <Button
              variant={isDayOff ? "success" : "danger"}
              className="h-10 text-[10px] px-6"
              onClick={toggleDayOff}
            >
              {isDayOff ? "LIBERAR DIA" : "MARCAR FOLGA"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <BusinessHoursCard
              session={session}
              setSession={setSession}
              showToast={showToast}
            />

            <Card title="Bloquear Horários" icon={<Lock size={16} className="text-elite-red-500" />}>
              <div className="space-y-4">
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Trabalhe com flexibilidade! Selecione horários específicos no dia{" "}
                  <strong className="text-elite-cyan-400">
                    {selectedBookingDate.split("-").reverse().join("/")}
                  </strong>{" "}
                  para bloqueá-los de novos agendamentos online.
                </p>

                {isDayOff ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                    <p className="text-xs text-red-400 font-bold uppercase italic">
                      Este dia está marcado como folga
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">
                      Gostaria de bloquear horários específicos? Libere o dia primeiro.
                    </p>
                  </div>
                ) : slotsForBlocking.length === 0 ? (
                  <p className="text-center py-6 text-slate-500 text-[10px] uppercase font-black">
                    Nenhum horário comercial cadastrado
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slotsForBlocking.map((timeStr) => {
                      const isBlocked = session?.unavailableSlots?.some(
                        (u) => u.date === selectedBookingDate && u.time === timeStr,
                      );

                      // Check if occupied by a booked appointment or a request
                      const isBooked = appointments.some(
                        (a) =>
                          a.date === selectedBookingDate &&
                          a.time === timeStr &&
                          a.status !== AppointmentStatus.Rejected,
                      );

                      const isPending = appointmentRequests.some(
                        (r) =>
                          r.date === selectedBookingDate &&
                          r.time === timeStr &&
                          r.status === "pending",
                      );

                      let btnStyle = "border border-white/5 bg-slate-950/40 text-slate-300 hover:border-elite-cyan-500 hover:text-white";
                      let statusText = null;

                      if (isBlocked) {
                        btnStyle = "border border-red-500/50 bg-red-500/20 text-red-500 font-black hover:bg-red-500/30";
                        statusText = "BLOQUEADO";
                      } else if (isBooked) {
                        btnStyle = "border border-emerald-500/30 bg-emerald-500/5 text-emerald-400/80 cursor-not-allowed opacity-80";
                        statusText = "AGENDADO";
                      } else if (isPending) {
                        btnStyle = "border border-amber-500/30 bg-amber-500/5 text-amber-500/80 cursor-not-allowed opacity-80";
                        statusText = "PENDENTE";
                      }

                      return (
                        <button
                          key={timeStr}
                          type="button"
                          disabled={isBooked || isPending}
                          onClick={() => toggleSlotBlock(timeStr)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-bold transition-all ${btnStyle}`}
                          title={`${timeStr} - ${statusText || "Livre"}`}
                        >
                          <span className="text-xs">{timeStr}</span>
                          {statusText && (
                            <span className="text-[6px] tracking-tighter opacity-80 uppercase mt-0.5 font-bold">
                              {statusText}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            <Card title="Link do Cliente" icon={<LinkIcon size={16} />}>
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase font-black mb-2 tracking-tighter">
                    Link para bio do Instagram
                  </p>
                  <code className="text-elite-cyan-400 text-[10px] break-all block mb-4">
                    {window.location.origin}/?barberId={auth.currentUser?.uid}
                  </code>
                  <Button
                    className="w-full h-10 text-[10px]"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/?barberId=${auth.currentUser?.uid}`,
                      );
                      showToast("Link copiado!");
                    }}
                  >
                    COPIAR LINK
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <BookingRequestListView />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Agenda de Hoje" icon={<Calendar size={16} />}>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {appointments
                    .filter(
                      (a) => a.date === new Date().toISOString().split("T")[0],
                    )
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((apt) => {
                      const client = clients.find((c) => c.id === apt.clientId);
                      const service = services.find(
                        (s) => s.id === apt.serviceId,
                      );
                      return (
                        <div
                          key={apt.id}
                          className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-white/5"
                        >
                          <div>
                            <p className="font-black text-white italic uppercase text-xs">
                              {apt.time}
                            </p>
                            <p className="text-elite-cyan-400 font-bold text-[10px] uppercase">
                              {client?.name || "Cliente VIP"}
                            </p>
                          </div>
                          <Badge
                            variant={apt.completed ? "success" : "info"}
                            className="text-[8px]"
                          >
                            {service?.name || "Serviço"}
                          </Badge>
                        </div>
                      );
                    })}
                  {appointments.filter(
                    (a) => a.date === new Date().toISOString().split("T")[0],
                  ).length === 0 && (
                    <p className="text-center py-8 text-slate-500 text-[10px] uppercase font-black">
                      Nenhum agendamento para hoje
                    </p>
                  )}
                </div>
              </Card>

              <Card
                title="Histórico de Solicitações"
                icon={<History size={16} />}
              >
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {appointmentRequests
                    .filter((r) => r.status !== "pending")
                    .map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-4 bg-slate-950/30 rounded-2xl border border-white/5 opacity-60"
                      >
                        <div>
                          <p className="font-bold text-slate-300 text-[10px]">
                            {req.clientName}
                          </p>
                          <p className="text-[8px] text-slate-500">
                            {req.date.split("-").reverse().join("/")} às{" "}
                            {req.time}
                          </p>
                        </div>
                        <Badge
                          variant={
                            req.status === "accepted" ? "success" : "danger"
                          }
                          className="text-[7px] uppercase"
                        >
                          {req.status === "accepted" ? "Aceito" : "Recusado"}
                        </Badge>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleUpdateLoginName = async () => {
    if (!newLoginName.trim() || !auth.currentUser) return;

    if (!confirmPassword.trim()) {
      showToast(
        "Por favor, insira sua senha atual para confirmar a alteração.",
        "error",
      );
      return;
    }

    const digitsOnly = newLoginName.replace(/\D/g, "");
    const cleanNewName =
      digitsOnly.length >= 8
        ? digitsOnly
        : newLoginName.trim().toLowerCase().replace(/\s+/g, "");

    if (cleanNewName === session?.username?.toLowerCase()) {
      showToast("O novo nome de login é igual ao atual.", "info");
      return;
    }

    setIsUpdatingLoginName(true);
    try {
      const userId = auth.currentUser.uid;
      const currentEmail = auth.currentUser.email || "";

      // Re-authenticate first to prevent "requires-recent-login" errors
      let paddedPassword = confirmPassword;
      if (paddedPassword.length < 6) {
        paddedPassword = paddedPassword.padEnd(6, "0");
      }

      const credential = EmailAuthProvider.credential(
        currentEmail,
        paddedPassword,
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // 1. If user is logged with a custom@barbershop.com built-in account, update their Firebase Auth email
      if (currentEmail.endsWith("@barbershop.com")) {
        const newEmail = `${cleanNewName}@barbershop.com`;
        await updateEmail(auth.currentUser, newEmail);
      }

      // 2. Update their profile username in Firestore
      await updateDoc(doc(db, "users", userId), {
        username: cleanNewName,
      });

      // 3. Update local session state
      setSession((s) => (s ? { ...s, username: cleanNewName } : null));

      showToast(
        "Nome de login alterado! Use o novo nome para entrar na próxima vez.",
      );
      setNewLoginName("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Erro ao alterar nome de login:", err);
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        showToast("Senha de confirmação incorreta.", "error");
      } else if (err.code === "auth/requires-recent-login") {
        showToast(
          "Por motivos de segurança, você precisa fazer login novamente para alterar o login.",
          "error",
        );
      } else {
        showToast(
          `Erro ao alterar login: ${err.message || "Erro desconhecido"}`,
          "error",
        );
      }
    } finally {
      setIsUpdatingLoginName(false);
    }
  };

  const handleLogout = async () => {
    try {
      setSimulatedUser(null);
      await auth.signOut();
      showToast("Sessão encerrada com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao deslogar:", err);
      showToast("Erro ao deslogar.", "error");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.target as HTMLFormElement);
    let email = (f.get("email") as string)?.trim() || "";
    let pass = (f.get("password") as string) || "";
    const shopName =
      (f.get("shopName") as string) || "Barbearia Matheus Farias";
    const phone = (f.get("phone") as string) || "";

    // Convert username to email if no '@' is present
    if (email && !email.includes("@")) {
      const digitsOnly = email.replace(/\D/g, "");
      if (digitsOnly.length >= 8) {
        email = digitsOnly;
      }
      email = `${email.toLowerCase().replace(/\s+/g, "")}@barbershop.com`;
    }

    // Seamlessly bypass Firebase's 6-character limit for short passwords (e.g., "1234" becomes "123400")
    if (pass && pass.length < 6) {
      pass = pass.padEnd(6, "0");
    }

    setAuthError(null);
    setShowEmailAuthGuide(false);

    try {
      if (authMode === "register") {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          pass,
        );
        const user = userCredential.user;

        // Initial profile setup
        const username = email.split("@")[0];
        await setDoc(doc(db, "users", user.uid), {
          username,
          shopName,
          phone,
          profileImage: DEFAULT_PROFILE_IMG,
          monthlyGoal: 5000,
          marketing_msg: "",
          campaign_goal: "",
          privacy_mode: false,
        });

        // Try to migrate data from localStorage if it exists for this username
        showToast("Migrando seus dados locais para a nuvem...");
        await migrateLocalData(user.uid, username);

        setAuthMode("login");
        showToast("Conta criada com sucesso!");
        return;
      }

      if (authMode === "reset") {
        // Firebase password reset would go here, but for now we'll just show a message
        showToast(
          "Funcionalidade de recuperação em breve. Contate o suporte.",
          "info",
        );
        setAuthMode("login");
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, email, pass);
        showToast("Bem-vindo de volta!");
      } catch (loginErr: any) {
        // If login failed, but they entered "Matheus" or "Admin", automatically sign them up if user doesn't exist
        const isDefaultUser =
          email === "admin@barbershop.com" ||
          email === "matheus@barbershop.com";
        const isDefaultPassword =
          pass === "372087" ||
          pass === "1234" ||
          pass.padEnd(6, "0") === "123400" ||
          pass.padEnd(6, "0") === "372087" ||
          pass === "37208700";

        if (
          isDefaultUser &&
          (loginErr.code === "auth/user-not-found" ||
            loginErr.code === "auth/invalid-credential")
        ) {
          try {
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              email,
              pass,
            );
            const user = userCredential.user;

            const username = email.split("@")[0];
            await setDoc(doc(db, "users", user.uid), {
              username,
              shopName: "Barbearia Matheus Farias",
              phone: "",
              profileImage: DEFAULT_PROFILE_IMG,
              monthlyGoal: 5000,
              marketing_msg: "",
              campaign_goal: "",
              privacy_mode: false,
            });
            showToast("Conta criada e acessada com sucesso!");
            return;
          } catch (createErr) {
            console.error("Auto creation error:", createErr);
          }
        }

        // Seamless robust fallback to local/simulated session for the primary "Matheus/372087" user
        if (isDefaultUser && isDefaultPassword) {
          setSimulatedUser({
            uid: email === "admin@barbershop.com" ? "offline_demo" : "matheus_farias",
            email: email,
            displayName: email === "admin@barbershop.com" ? "Matheus Farias (Modo Admin Local)" : "Matheus Farias",
          });
          showToast("Acesso principal estabelecido!", "success");
          return;
        }

        throw loginErr;
      }
    } catch (err: any) {
      console.error("Auth Error:", err.code, err.message);
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setAuthError("E-mail ou senha incorretos.");
      } else if (err.code === "auth/email-already-in-use") {
        setAuthError("Este e-mail já está em uso.");
      } else if (err.code === "auth/weak-password") {
        setAuthError("A senha deve ter pelo menos 6 caracteres.");
      } else if (err.code === "auth/invalid-email") {
        setAuthError("E-mail inválido.");
      } else if (err.code === "auth/too-many-requests") {
        setAuthError("Muitas tentativas. Tente novamente mais tarde.");
      } else if (err.code === "auth/user-disabled") {
        setAuthError("Esta conta foi desativada.");
      } else if (err.code === "auth/operation-not-allowed") {
        setAuthError(
          "Erro de Configuração no Firebase: O método de login por E-mail/Senha está desativado.",
        );
        setShowEmailAuthGuide(true);
      } else if (
        err.code?.includes("api-key-not-valid") ||
        err.message?.includes("api-key-not-valid") ||
        err.code === "auth/api-key-not-valid"
      ) {
        setAuthError(
          "Erro de Chave de API: O Firebase acabou de ser provisionado e a chave de API leva de 2 a 5 minutos para se propagar nos servidores globais do Google. Por favor, aguarde alguns instantes e faça uma atualização forçada da página (Ctrl+Shift+R ou Cmd+Shift+R) para renovar a conexão.",
        );
      } else {
        setAuthError(
          `Erro ao autenticar: ${err.code || "Erro desconhecido"}. Verifique sua conexão e tente novamente.`,
        );
      }
    }
  };

  const handlePhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean = false,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) setEditPhotoBase64(reader.result as string);
        else setClientPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveNewClient = async (
    name: string,
    phone: string,
    photo: string | null,
  ) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const clientId = Date.now().toString();

    try {
      await setDoc(doc(db, "users", userId, "clients", clientId), {
        id: clientId,
        name,
        phone,
        totalSpent: 0,
        photo: photo || null,
      });
      setPendingClient(null);
      setClientPhotoBase64(null);
      showToast("Novo membro VIP!");
      return clientId;
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${userId}/clients/${clientId}`,
      );
    }
  };

  const handleEditServiceSave = async (serviceId: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    if (!editingServiceName.trim()) {
      showToast("O nome do serviço não pode ser vazio!", "error");
      return;
    }
    try {
      await updateDoc(doc(db, "users", userId, "services", serviceId), {
        name: editingServiceName.trim(),
        price: Number(editingServicePrice),
      });
      setEditingServiceId(null);
      showToast("Serviço atualizado!");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${userId}/services/${serviceId}`,
      );
    }
  };

  const handleVerifyAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminInputPassword === "231456") {
      setIsAdminUnlocked(true);
      setAdminPasswordError("");
      setAdminInputPassword("");
      showToast("Acesso administrativo liberado!");
    } else {
      setAdminPasswordError("Senha incorreta! Tente novamente.");
      showToast("Senha incorreta!", "error");
    }
  };

  const handleRequestAction = async (
    requestId: string,
    action: "accept" | "reject",
  ) => {
    const userId = auth.currentUser?.uid || "offline_demo";
    const request = appointmentRequests.find((r) => r.id === requestId);
    if (!request) return;

    setProcessingRequestId(requestId);

    try {
      if (action === "accept") {
        const cleanReqPhone = request.clientPhone ? request.clientPhone.replace(/\D/g, "") : "";
        let clientId = clients.find((c) => c.phone && c.phone.replace(/\D/g, "") === cleanReqPhone)?.id;
        
        if (!clientId) {
          clientId = await saveNewClient(
            request.clientName,
            request.clientPhone,
            null,
          );
        }

        if (clientId) {
          const aptId = Date.now().toString();
          const service = services.find((s) => s.id === request.serviceId);
          await setDoc(doc(db, "users", userId, "appointments", aptId), {
            id: aptId,
            clientId,
            serviceId: request.serviceId,
            date: request.date,
            time: request.time,
            completed: false,
            paid: false,
            finalPrice: service?.price || 0,
            status: "confirmed",
            createdAt: new Date().toISOString(),
          });

          await updateDoc(doc(db, "users", userId, "requests", requestId), {
            status: "accepted",
            updatedAt: new Date().toISOString(),
          });

          // Optimistic local state update
          setAppointmentRequests((prev) => prev.filter((r) => r.id !== requestId));

          showToast("Agendamento confirmado com sucesso!", "success");

          // Send WhatsApp notification
          const msg = `Olá ${request.clientName}! Seu agendamento para ${service?.name || "Corte"} no dia ${request.date.split("-").reverse().join("/")} às ${request.time} foi CONFIRMADO com sucesso! Te esperamos na barbearia.`;
          sendWhatsAppNotification(request.clientPhone, msg);
        }
      } else {
        const reason =
          prompt("Motivo da recusa (opcional):") ||
          "Infelizmente não poderemos atender neste horário.";
        const msg = `Olá ${request.clientName}. Sua solicitação de agendamento para ${request.date.split("-").reverse().join("/")} às ${request.time} não pôde ser aceita. Motivo: ${reason}`;
        
        await updateDoc(doc(db, "users", userId, "requests", requestId), {
          status: "rejected",
          rejectReason: reason,
          updatedAt: new Date().toISOString(),
        });

        // Optimistic local state update
        setAppointmentRequests((prev) => prev.filter((r) => r.id !== requestId));

        sendWhatsAppNotification(request.clientPhone, msg);
        showToast("Solicitação recusada com sucesso.", "info");
      }
    } catch (err) {
      console.error("Erro ao processar ação da solicitação:", err);
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${userId}/requests/${requestId}`,
      );
      showToast("Erro ao processar solicitação. Tente novamente.", "error");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectWithReason = async (requestId: string, reasonText: string) => {
    const userId = auth.currentUser?.uid || "offline_demo";
    const request = appointmentRequests.find((r) => r.id === requestId);
    if (!request) return;

    setProcessingRequestId(requestId);

    try {
      const finalReason = reasonText.trim() || "Infelizmente não poderemos atender neste horário.";
      const service = services.find((s) => s.id === request.serviceId);
      
      const msg = `Olá ${request.clientName}. Sua solicitação de agendamento para ${service?.name || "Corte"} no dia ${request.date.split("-").reverse().join("/")} às ${request.time} foi recusada. Motivo: ${finalReason}`;
      
      await updateDoc(doc(db, "users", userId, "requests", requestId), {
        status: "rejected",
        rejectReason: finalReason,
        updatedAt: new Date().toISOString(),
      });

      // Optimistic local state update
      setAppointmentRequests((prev) => prev.filter((r) => r.id !== requestId));

      setShowRejectModal(false);
      setRejectingRequestId(null);
      setRejectReasonText("");
      
      showToast("Solicitação recusada e cliente notificado!", "info");
      sendWhatsAppNotification(request.clientPhone, msg);
    } catch (err) {
      console.error("Erro ao recusar solicitação:", err);
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${userId}/requests/${requestId}`,
      );
      showToast("Erro ao recusar solicitação.", "error");
    } finally {
      setProcessingRequestId(null);
    }
  };




  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.target as HTMLFormElement);
    const name = f.get("n") as string;
    const phone = f.get("p") as string;

    const nameExists = clients.some(
      (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim(),
    );

    if (nameExists) {
      setPendingClient({ name, phone, photo: clientPhotoBase64 });
      return;
    }

    await saveNewClient(name, phone, clientPhotoBase64);
    (e.target as HTMLFormElement).reset();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const f = new FormData(e.target as HTMLFormElement);
    const name = f.get("n") as string;
    const phone = f.get("p") as string;

    try {
      await updateDoc(doc(db, "users", userId, "clients", editingClient.id), {
        name,
        phone,
        photo: editPhotoBase64 || editingClient.photo || null,
      });
      setEditingClient(null);
      setEditPhotoBase64(null);
      showToast("Dados atualizados!");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${userId}/clients/${editingClient.id}`,
      );
    }
  };

  if (!isAuthReady)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <LogoElite className="h-24 w-24" />
          <p className="text-elite-cyan-400 font-black tracking-widest text-[10px] uppercase">
            Carregando Sistema...
          </p>
        </div>
      </div>
    );

  if (barberIdFromUrl) return <PublicBookingView barberIdFromUrl={barberIdFromUrl} />;

  if (!isAuthenticated)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
        {/* Ambient luxury light orbs for a premium deep slate aesthetic with brand red & warm gold glows */}
        <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] bg-elite-red-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] bg-[#E1B15F]/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500 relative z-10">
          <div className="text-center">
            <div className="relative inline-block mb-3">
              <LogoElite className="mx-auto h-24 w-24 relative z-10" />
              <div className="absolute inset-0 bg-elite-red-500/20 rounded-full blur-md opacity-30 scale-110" />
            </div>
            
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">
              Barbershop
              <br />
              <span className="text-elite-red-500 text-4xl font-extrabold tracking-tight drop-shadow-[0_4px_12px_rgba(239,68,68,0.2)]">
                Matheus Farias
              </span>
            </h2>
          </div>
          
          <Card className="glass-card border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[24px]">
            <form className="space-y-5" onSubmit={handleAuth}>
              {authError && (
                <p className="text-[10px] text-red-500 font-black uppercase text-center bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                  {authError}
                </p>
              )}

              {showEmailAuthGuide && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3 text-left">
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 justify-center">
                    <AlertTriangle size={14} /> COMO ATIVAR NO FIREBASE:
                  </p>
                  <ol className="text-[9px] text-slate-300 font-medium space-y-1.5 list-decimal pl-4 leading-normal uppercase">
                    <li>
                      Acesse o{" "}
                      <a
                        href="https://console.firebase.google.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-elite-cyan-400 underline lowercase"
                      >
                        console.firebase.google.com
                      </a>
                      .
                    </li>
                    <li>Selecione o seu projeto de desenvolvimento.</li>
                    <li>
                      Clique em{" "}
                      <strong className="text-white">
                        Build &gt; Authentication
                    </strong>{" "}
                      no menu esquerdo.
                    </li>
                    <li>
                      Acesse a aba{" "}
                      <strong className="text-white">Sign-in method</strong>{" "}
                      (Método de login).
                    </li>
                    <li>
                      Clique em{" "}
                      <strong className="text-white">
                        Adicionar novo provedor
                    </strong>{" "}
                      e selecione{" "}
                      <strong className="text-white">E-mail/Senha</strong>.
                    </li>
                    <li>
                      Ative a primeira opção{" "}
                      <strong className="text-white">E-mail/Senha</strong> e
                      clique em <strong className="text-white">Salvar</strong>.
                    </li>
                  </ol>
                  <p className="text-[8px] text-slate-400 font-bold leading-normal text-center">
                    * SEU USUÁRIO DE ACESSO PADRÃO "MATHEUS" COM A SENHA "372087"
                    ESTÁ CONFIGURADO E PRONTO PARA ENTRAR.
                  </p>
                </div>
              )}

              {authMode === "register" && (
                <>
                  <Input
                    label="NOME DA BARBEARIA"
                    name="shopName"
                    placeholder="EX: BARBER SHOP"
                    required
                  />
                  <Input
                    label="WHATSAPP"
                    name="phone"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </>
              )}

              <Input
                label="E-MAIL OU USUÁRIO"
                name="email"
                type="text"
                placeholder="Insira seu e-mail ou usuário"
                required
              />

              <Input
                label={authMode === "reset" ? "NOVA SENHA" : "SENHA"}
                name="password"
                type="password"
                placeholder="Digite sua senha"
                required
              />

              <Button type="submit" className="w-full py-4 tracking-widest text-xs shadow-xl active:scale-[0.98] transition-transform">
                {authMode === "login"
                  ? "ACESSAR PAINEL"
                  : authMode === "register"
                    ? "FINALIZAR CADASTRO"
                    : "CONFIRMAR NOVA SENHA"}
              </Button>

              <div className="flex flex-col gap-3 mt-4 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "register" : "login");
                    setAuthError(null);
                  }}
                  className="w-full text-[10px] text-slate-400 hover:text-[#E1B15F] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  {authMode === "login"
                    ? "CRIAR NOVA CONTA"
                    : "VOLTAR PARA LOGIN"}
                </button>

                {authMode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("reset");
                      setAuthError(null);
                    }}
                    className="w-full text-[10px] text-slate-500 hover:text-white font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    ESQUECI MINHA SENHA
                  </button>
                )}
              </div>
            </form>
          </Card>
          <div className="pt-2">
            <WoodenMouseSignature />
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen text-slate-100 flex overflow-hidden bg-slate-950">
      {/* Edição de Cliente Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg">
            <Card
              title="Editar Dados do Cliente"
              icon={<Edit3 size={18} />}
              actions={
                <button
                  onClick={() => {
                    setEditingClient(null);
                    setEditPhotoBase64(null);
                  }}
                  className="text-slate-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              }
            >
              <form className="space-y-6" onSubmit={handleEditSubmit}>
                <div className="flex justify-center mb-4">
                  <div className="relative group">
                    <div className="h-24 w-24 rounded-3xl border-2 border-elite-red-500 overflow-hidden shadow-2xl">
                      <img
                        src={
                          editPhotoBase64 ||
                          editingClient.photo ||
                          "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200"
                        }
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                      <Camera className="text-white" size={24} />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handlePhotoChange(e, true)}
                      />
                    </label>
                  </div>
                </div>
                <Input
                  label="NOME COMPLETO"
                  name="n"
                  defaultValue={editingClient.name}
                  required
                />
                <Input
                  label="WHATSAPP"
                  name="p"
                  defaultValue={editingClient.phone}
                  required
                />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" variant="success" className="flex-1">
                    SALVAR ALTERAÇÕES
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setEditingClient(null);
                      setEditPhotoBase64(null);
                    }}
                  >
                    CANCELAR
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Alerta de Nome Duplicado */}
      {pendingClient && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md">
            <div className="bg-slate-900 border-2 border-elite-red-500/50 rounded-[32px] p-8 flex flex-col items-center justify-center text-center space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
              <div className="bg-elite-red-500/20 p-4 rounded-full">
                <AlertCircle
                  size={48}
                  className="text-elite-red-500 animate-pulse"
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-white font-black uppercase text-xl tracking-tighter italic">
                  Nome já registrado!
                </h4>
                <p className="text-slate-400 text-xs font-bold uppercase">
                  Já existe um cliente chamado "{pendingClient.name}". <br />{" "}
                  Como deseja prosseguir?
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 w-full">
                <Button
                  variant="primary"
                  className="py-4"
                  onClick={() => {
                    const count =
                      clients.filter((c) =>
                        c.name.startsWith(pendingClient.name),
                      ).length + 1;
                    saveNewClient(
                      `${pendingClient.name} ${count}`,
                      pendingClient.phone,
                      pendingClient.photo,
                    );
                  }}
                >
                  DIFERENCIAR NOME
                </Button>
                <Button
                  variant="warning"
                  className="py-4"
                  onClick={() =>
                    saveNewClient(
                      pendingClient.name,
                      pendingClient.phone,
                      pendingClient.photo,
                    )
                  }
                >
                  CONTINUAR (MANTER IGUAL)
                </Button>
                <Button
                  variant="ghost"
                  className="text-white font-black"
                  onClick={() => setPendingClient(null)}
                >
                  CORRIGIR DADOS
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Informar o Motivo da Recusa */}
      {showRejectModal && rejectingRequestId && (() => {
        const req = appointmentRequests.find((r) => r.id === rejectingRequestId);
        if (!req) return null;
        const service = services.find((s) => s.id === req.serviceId);
        
        return (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[28px] p-8 shadow-[0_0_100px_rgba(239,68,68,0.15)] space-y-6">
              
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] text-elite-red-500 font-extrabold uppercase tracking-widest bg-elite-red-500/10 px-3 py-1 rounded-full">
                    RECUSAR AGENDAMENTO
                  </span>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight mt-2">
                    Definir Motivo da Recusa
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingRequestId(null);
                  }}
                  className="p-2 bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Informações da Solicitação */}
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Cliente:</span>
                  <span className="text-white font-extrabold">{req.clientName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Telefone:</span>
                  <span className="text-white font-mono font-bold">{req.clientPhone}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Serviço:</span>
                  <span className="text-elite-cyan-400 font-black uppercase italic">{service?.name || "Corte de Cabelo"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Data/Hora:</span>
                  <span className="text-[#E1B15F] font-black">{req.date.split("-").reverse().join("/")} às {req.time}</span>
                </div>
              </div>

              {/* Motivos Rápidos */}
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">
                  Motivos Rápidos (Clique para usar):
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Horário não disponível na agenda.",
                    "Não estaremos funcionando neste horário.",
                    "Barbearia fechada para folga/feriado.",
                    "Imprevisto técnico com os equipamentos.",
                    "Serviço indisponível temporariamente."
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectReasonText(preset)}
                      className="text-[9px] px-3 py-1.5 bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-lg border border-white/5 transition-all text-left cursor-pointer font-medium"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo de Texto */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                  Texto do Motivo personalizado (será enviado ao cliente):
                </label>
                <textarea
                  value={rejectReasonText}
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  placeholder="Ex: Infelizmente tivemos um imprevisto e não poderemos te atender. Você pode agendar para outro horário?"
                  className="w-full text-xs font-semibold p-4 shadow-sm text-white bg-slate-950 border border-white/10 rounded-2xl placeholder-slate-600 focus:outline-none focus:border-elite-red-500/50 min-h-[100px] resize-none"
                />
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  className="flex-1 text-slate-400 font-black hover:text-white"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingRequestId(null);
                  }}
                >
                  VOLTAR
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 py-4 bg-elite-red-500 hover:bg-elite-red-600 text-white font-black"
                  onClick={() => handleRejectWithReason(req.id, rejectReasonText)}
                >
                  RECUSAR E ENVIAR
                </Button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal de Atualização do Sistema */}
      {showUpdateModal && systemConfig && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="w-full max-w-md">
            <div className="bg-slate-900 border-2 border-elite-cyan-500/50 rounded-[40px] p-10 flex flex-col items-center text-center space-y-8 shadow-[0_0_100px_rgba(34,211,238,0.2)]">
              <div className="bg-elite-cyan-500/20 p-6 rounded-[32px] relative">
                <Sparkles
                  size={64}
                  className="text-elite-cyan-400 animate-pulse"
                />
                <div className="absolute -top-2 -right-2 bg-elite-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full animate-bounce">
                  NOVO
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">
                  Sistema
                  <br />
                  <span className="text-elite-cyan-400">Atualizado!</span>
                </h3>
                <p className="text-slate-400 text-sm font-bold uppercase leading-relaxed">
                  Uma nova versão ({systemConfig.version}) está disponível com
                  melhorias e novas funcionalidades.
                </p>
                {systemConfig.updateMessage && (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-left">
                    <p className="text-[10px] text-elite-cyan-400 font-black uppercase mb-1">
                      O que mudou:
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {systemConfig.updateMessage}
                    </p>
                  </div>
                )}
              </div>
              <Button
                variant="cyan"
                className="w-full py-5 text-lg"
                onClick={() => window.location.reload()}
              >
                RECARREGAR AGORA
              </Button>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="text-[10px] text-slate-500 font-black uppercase tracking-widest hover:text-white transition-all"
              >
                LEMBRAR MAIS TARDE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Painel de Notificações */}
      {showNotifications && (
        <div className="fixed inset-0 z-[150] flex items-end justify-end p-4 pointer-events-none">
          <div className="w-full max-w-sm bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-300 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <BellRing size={20} className="text-elite-red-500" />
                <h4 className="text-sm font-black text-white uppercase tracking-widest">
                  Notificações
                </h4>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-[10px] text-slate-500 hover:text-elite-cyan-400 font-black uppercase transition-all"
                >
                  Lidas
                </button>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <BellRing size={24} className="text-slate-700" />
                  </div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    Nenhuma notificação por enquanto
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border transition-all ${n.read ? "bg-white/5 border-white/5 opacity-60" : "bg-elite-red-500/10 border-elite-red-500/20 shadow-lg shadow-elite-red-500/5"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${n.type === "update" ? "bg-elite-cyan-500/20 text-elite-cyan-400" : n.type === "alert" ? "bg-elite-red-500/20 text-elite-red-500" : "bg-white/10 text-slate-400"}`}
                      >
                        {n.type || "info"}
                      </span>
                      <span className="text-[8px] font-bold text-slate-500">
                        {new Date(n.date).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <h5 className="text-xs font-black text-white uppercase mb-1">
                      {n.title}
                    </h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                      {n.message}
                    </p>
                    {!n.read && (
                      <button
                        onClick={() => markNotificationAsRead(n.id)}
                        className="text-[8px] font-black text-elite-cyan-400 uppercase tracking-widest hover:text-white transition-all"
                      >
                        MARCAR COMO LIDA
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950/95 backdrop-blur-2xl border-r border-white/5 transition-all duration-300 lg:static lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:w-20"}`}
      >
        <div className="h-full flex flex-col p-5 sm:p-6 justify-between">
          <div>
            <div className="mb-6 flex items-center justify-between overflow-hidden">
              <div className="flex items-center gap-3">
                <LogoElite className="h-9 w-9 min-w-[36px]" />
                {isSidebarOpen && (
                  <div className="truncate">
                    <h1 className="text-[10px] font-black text-white uppercase tracking-widest">
                      Matheus Farias
                    </h1>
                    <p className="text-[8px] text-elite-red-500 font-black uppercase truncate">
                      {session?.shopName}
                    </p>
                  </div>
                )}
              </div>
              {isSidebarOpen && (
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all group cursor-pointer"
                >
                  <BellRing
                    size={16}
                    className={
                      notifications.some((n) => !n.read)
                        ? "text-elite-red-500 animate-bounce"
                        : "text-slate-500 group-hover:text-white"
                    }
                  />
                  {notifications.some((n) => !n.read) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-elite-red-500 rounded-full border-2 border-slate-950"></span>
                  )}
                </button>
              )}
            </div>
            <nav className="space-y-1 overflow-y-auto pr-1 max-h-[calc(100vh-230px)] custom-scrollbar">
              {[
                { id: Tab.Dashboard, icon: LayoutDashboard, label: "Painel" },
                { id: Tab.Agenda, icon: Calendar, label: "Agenda" },
                { id: Tab.OnlineBooking, icon: Smartphone, label: "Online" },
                { id: Tab.Clients, icon: Users, label: "Clientes" },
                { id: Tab.Finance, icon: TrendingUp, label: "Financeiro" },
                { id: Tab.Reports, icon: FileBarChart, label: "Relatórios" },
                { id: Tab.Marketing, icon: Megaphone, label: "Marketing AI" },
                { id: Tab.Services, icon: Scissors, label: "Serviços" },
                { id: Tab.Drinks, icon: Beer, label: "Bebidas" },
                { id: Tab.Inventory, icon: Box, label: "Estoque" },
                { id: Tab.Profile, icon: Settings, label: "Perfil" },
                ...(isAdmin
                  ? [{ id: Tab.Admin, icon: ShieldCheck, label: "Admin" }]
                  : []),
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === item.id ? "bg-elite-red-500 text-white shadow-lg shadow-elite-red-500/20" : "text-slate-500 hover:text-white hover:bg-white/5"}`}
                >
                  <item.icon size={16} />
                  {isSidebarOpen && <span>{item.label}</span>}
                </button>
              ))}
            </nav>
          </div>

          <div className="space-y-2 pt-3 border-t border-white/5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E1B15F] hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
            >
              <LogOut size={16} />
              {isSidebarOpen && <span>Sair do Sistema</span>}
            </button>
            <WoodenMouseSignature minimal={!isSidebarOpen} />
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 min-h-screen flex flex-col bg-slate-950 overflow-y-auto">
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-white/5 lg:hidden cursor-pointer"
            >
              <LayoutDashboard size={18} />
            </button>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white truncate flex items-center gap-2">
              {activeTab}
            </h2>
            {localStorage.getItem('force_offline') === 'true' && (
              <div 
                onClick={() => {
                  if (window.confirm("Deseja tentar se reconectar ao banco de dados em nuvem? Os novos dados salvos continuarão disponíveis localmente.")) {
                    localStorage.removeItem('force_offline');
                    window.location.reload();
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-[8px] sm:text-[9px] font-black uppercase tracking-wider cursor-pointer hover:bg-amber-500/20 transition-all"
                title="Modo de Alta Disponibilidade Local Ativo. Clique para tentar reconectar."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="hidden md:inline">Modo Contingência</span>
                <span className="md:hidden">Local</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isSaving && (
              <Badge variant="cyan" className="animate-pulse text-[8px]">
                SALVANDO...
              </Badge>
            )}
            <button
              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
              className="p-2 bg-slate-900 border border-white/5 rounded-xl text-slate-400 hover:text-elite-cyan-400 transition-all cursor-pointer"
              title="Modo Privacidade"
            >
              {isPrivacyMode ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-900 border border-white/5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/20 transition-all cursor-pointer"
              title="Sair do Sistema"
            >
              <LogOut size={15} />
            </button>
            <div className="h-8 w-8 rounded-xl border border-elite-red-500/30 bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={session?.profileImage}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8 pb-32 flex-1">
          {toast && (
            <div
              className={`fixed bottom-8 right-6 sm:right-10 z-[100] px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2.5 animate-in slide-in-from-right duration-300 shadow-2xl ${toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-500 text-black"}`}
            >
              {toast.type === "error" ? (
                <AlertTriangle size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}{" "}
              {toast.message}
            </div>
          )}

          {activeTab === Tab.OnlineBooking && <OnlineBookingView />}

          {activeTab === Tab.Agenda && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in slide-in-from-bottom duration-500">
              {/* Coluna Esquerda: Novo Agendamento & Solicitações */}
              <div className="lg:col-span-5 xl:col-span-5 space-y-6">
                {appointmentRequests.length > 0 && <BookingRequestListView />}
                
                <Card title="Novo Agendamento" icon={<Plus size={16} />}>
                  <form
                    className="space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const date = selectedDate;
                      const time = aptTimeInput || (form.elements.namedItem("t") as HTMLInputElement)?.value;
                      const serviceId = selectedAptService?.id || (form.elements.namedItem("s") as HTMLSelectElement)?.value;
                      const customPriceInput = (form.elements.namedItem("cp") as HTMLInputElement)?.value;
                      const customPrice = !isPricePendingOnComplete && customPriceInput ? Number(customPriceInput) : null;

                      if (!time) {
                        return showToast("Selecione ou digite um horário!", "error");
                      }
                      if (!serviceId) {
                        return showToast("Selecione um corte ou serviço!", "error");
                      }
                      if (!selectedAptClient) {
                        return showToast("Selecione um cliente!", "error");
                      }

                      const service = services.find((s) => s.id === serviceId) || selectedAptService;
                      const conflict = appointments.find(
                        (a) =>
                          a.date === date && a.time === time && !a.completed,
                      );
                      if (conflict)
                        return showToast(
                          "Este horário já está ocupado na agenda!",
                          "error",
                        );

                      const id = Date.now().toString();
                      const userId = auth.currentUser?.uid;
                      if (!userId) return;
                      try {
                        await setDoc(
                          doc(db, "users", userId, "appointments", id),
                          {
                            id,
                            clientId: selectedAptClient.id,
                            serviceId: serviceId,
                            date,
                            time,
                            completed: false,
                            paid: false,
                            finalPrice: isPricePendingOnComplete
                              ? 0
                              : (customPrice !== null
                                ? customPrice
                                : service?.price || 0),
                            pricePending: isPricePendingOnComplete,
                            status: "confirmed",
                            createdAt: new Date().toISOString(),
                          },
                        );
                        setAptClientSearch("");
                        setSelectedAptClient(null);
                        setSelectedAptService(null);
                        setAptServiceSearch("");
                        setAptTimeInput("");
                        setIsPricePendingOnComplete(false);
                        showToast("Horário agendado com sucesso!", "success");
                      } catch (err) {
                        handleFirestoreError(
                          err,
                          OperationType.WRITE,
                          `users/${userId}/appointments/${id}`,
                        );
                      }
                    }}
                  >
                    {/* DATA DO AGENDAMENTO */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-elite-cyan-400 uppercase tracking-widest ml-1">
                          DATA DO AGENDAMENTO
                        </label>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                            className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase transition-all cursor-pointer ${
                              selectedDate === new Date().toISOString().split("T")[0]
                                ? "bg-elite-cyan-500/20 text-elite-cyan-300 border border-elite-cyan-500/40 shadow-sm"
                                : "bg-slate-900 text-slate-400 hover:text-white"
                            }`}
                          >
                            Hoje
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const tomorrow = new Date();
                              tomorrow.setDate(tomorrow.getDate() + 1);
                              setSelectedDate(tomorrow.toISOString().split("T")[0]);
                            }}
                            className="text-[9px] px-2.5 py-1 rounded-lg font-black uppercase bg-slate-900 text-slate-400 hover:text-white transition-all cursor-pointer"
                          >
                            Amanhã
                          </button>
                        </div>
                      </div>
                      <Input
                        name="d"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        required
                      />
                    </div>

                    {/* SELEÇÃO FLUIDA DE HORÁRIOS */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-elite-cyan-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <Clock size={12} /> HORÁRIO DISPONÍVEL
                        </label>
                        {aptTimeInput && (
                          <span className="text-[10px] font-black text-[#E1B15F] bg-[#E1B15F]/10 px-2 py-0.5 rounded-md uppercase">
                            {aptTimeInput}
                          </span>
                        )}
                      </div>
                      
                      {/* Campo Manual com suporte a Digitação e 1-Click Select */}
                      <Input
                        name="t"
                        type="time"
                        value={aptTimeInput}
                        onChange={(e) => setAptTimeInput(e.target.value)}
                        required
                      />

                      {/* Seletor Rápido de Horários Organizado por Turnos */}
                      <div className="space-y-2 p-3 bg-slate-950/70 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Grade Rápida do Dia:</span>
                          <span className="text-[8px] text-slate-500 font-normal">Clique para selecionar</span>
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                          {(() => {
                            const openHour = session?.businessHours?.open ? parseInt(session.businessHours.open.split(":")[0], 10) : 8;
                            const closeHour = session?.businessHours?.close ? parseInt(session.businessHours.close.split(":")[0], 10) : 19;
                            const intStart = session?.businessHours?.intervalStart?.trim();
                            const intEnd = session?.businessHours?.intervalEnd?.trim();

                            const quickSlots: string[] = [];
                            for (let h = openHour; h <= closeHour; h++) {
                              const hStr = String(h).padStart(2, "0");
                              quickSlots.push(`${hStr}:00`);
                              if (h < closeHour) {
                                quickSlots.push(`${hStr}:30`);
                              }
                            }

                            return quickSlots.map((timeStr) => {
                              const isOccupied = appointments.some(
                                (a) => a.date === selectedDate && a.time === timeStr && !a.completed
                              );
                              
                              let isLunch = false;
                              if (intStart && intEnd) {
                                const startMin = timeToMinutes(intStart);
                                const endMin = timeToMinutes(intEnd);
                                const slotMin = timeToMinutes(timeStr);
                                if (startMin < endMin) {
                                  isLunch = slotMin >= startMin && slotMin < endMin;
                                } else {
                                  isLunch = slotMin >= startMin || slotMin < endMin;
                                }
                              }

                              const isSelected = aptTimeInput === timeStr;

                              return (
                                <button
                                  key={timeStr}
                                  type="button"
                                  disabled={isOccupied || isLunch}
                                  onClick={() => setAptTimeInput(timeStr)}
                                  className={`text-[9px] py-1.5 px-1 rounded-lg font-black transition-all cursor-pointer text-center select-none ${
                                    isSelected
                                      ? "bg-[#E1B15F] text-slate-950 shadow-md font-black scale-105"
                                      : isOccupied
                                      ? "bg-red-500/10 text-red-500/40 border border-red-500/10 cursor-not-allowed line-through"
                                      : isLunch
                                      ? "bg-amber-500/10 text-amber-500/40 border border-amber-500/10 cursor-not-allowed"
                                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/5 hover:border-elite-cyan-400/40"
                                  }`}
                                  title={isOccupied ? "Horário ocupado" : isLunch ? "Pausa para almoço" : `Selecionar ${timeStr}`}
                                >
                                  {timeStr}
                                  {isLunch && <span className="block text-[6px] text-amber-500/60 font-bold">Almoço</span>}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* CLIENTE VIP COM BUSCA EM TEMPO REAL */}
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-black text-elite-cyan-400 uppercase tracking-widest ml-1">
                        CLIENTE
                      </label>
                      <div className="flex items-center gap-2">
                        {selectedAptClient && (
                          <div className="h-10 w-10 min-w-[40px] rounded-xl border-2 border-elite-red-500 overflow-hidden shadow-lg animate-in zoom-in duration-200">
                            {selectedAptClient.photo ? (
                              <img
                                src={selectedAptClient.photo}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-slate-900 flex items-center justify-center font-black text-elite-red-500 uppercase text-xs">
                                {selectedAptClient.name.charAt(0)}
                              </div>
                            )}
                          </div>
                        )}
                        <input
                          type="text"
                          placeholder="Buscar cliente por nome..."
                          className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-elite-red-500 outline-none"
                          value={aptClientSearch}
                          onChange={(e) => {
                            setAptClientSearch(e.target.value);
                            setShowAptResults(true);
                            if (selectedAptClient) setSelectedAptClient(null);
                          }}
                        />
                      </div>
                      {showAptResults && aptClientSearch.trim() && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[160px] overflow-y-auto p-1 space-y-1">
                          {clients
                            .filter((c) =>
                              c.name
                                .toLowerCase()
                                .includes(aptClientSearch.toLowerCase()),
                            )
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                                onClick={() => {
                                  setSelectedAptClient(c);
                                  setAptClientSearch(c.name);
                                  setShowAptResults(false);
                                }}
                              >
                                <div className="h-8 w-8 rounded-lg bg-slate-950 border border-elite-red-500/20 flex items-center justify-center overflow-hidden shrink-0">
                                  {c.photo ? (
                                    <img
                                      src={c.photo}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[9px] font-black text-elite-red-500 uppercase">
                                      {c.name.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div className="truncate">
                                  <span className="text-[10px] font-black text-white uppercase block truncate">
                                    {c.name}
                                  </span>
                                  {c.phone && (
                                    <span className="text-[8px] text-slate-400 font-mono">
                                      {c.phone}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* CORTE / SERVIÇO COM PESQUISA INSTANTÂNEA E CHIPS */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-elite-cyan-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <Scissors size={12} /> CORTE / SERVIÇO
                        </label>
                        {selectedAptService && (
                          <span className="text-[9px] font-black text-[#E1B15F] uppercase">
                            R$ {selectedAptService.price} • {selectedAptService.duration || 30} min
                          </span>
                        )}
                      </div>

                      {selectedAptService ? (
                        <div className="p-3 bg-slate-950/80 border border-[#E1B15F]/40 rounded-2xl flex items-center justify-between shadow-lg animate-in zoom-in-95 duration-200">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#E1B15F]/15 rounded-xl text-[#E1B15F]">
                              <Scissors size={15} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-white uppercase italic">
                                {selectedAptService.name}
                              </p>
                              <p className="text-[10px] font-extrabold text-[#E1B15F]">
                                R$ {selectedAptService.price} <span className="text-slate-400 font-normal">• {selectedAptService.duration || 30} min</span>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAptService(null);
                              setAptServiceSearch("");
                              setShowAptServiceResults(true);
                            }}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer border border-white/5"
                          >
                            Trocar
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 relative">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Pesquisar corte... (ex: degradê, social, barba)"
                              value={aptServiceSearch}
                              onChange={(e) => {
                                setAptServiceSearch(e.target.value);
                                setShowAptServiceResults(true);
                              }}
                              onFocus={() => setShowAptServiceResults(true)}
                              className="w-full bg-slate-950/80 border border-elite-cyan-500/30 focus:border-elite-cyan-400 rounded-xl px-4 py-2.5 text-white text-xs font-bold outline-none placeholder-slate-500 transition-all"
                            />
                            {aptServiceSearch && (
                              <button
                                type="button"
                                onClick={() => setAptServiceSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          {/* Chips Rápidos dos Principais Cortes */}
                          <div className="flex flex-wrap gap-1.5">
                            {services.slice(0, 4).map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAptService(s);
                                  setAptServiceSearch("");
                                  setShowAptServiceResults(false);
                                }}
                                className="text-[9px] px-2.5 py-1 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-[#E1B15F] rounded-lg font-black border border-white/5 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>{s.name}</span>
                                <span className="text-[#E1B15F] font-mono">R${s.price}</span>
                              </button>
                            ))}
                          </div>

                          {showAptServiceResults && (
                            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[180px] overflow-y-auto p-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
                              {services
                                .filter((s) =>
                                  s.name.toLowerCase().includes(aptServiceSearch.toLowerCase())
                                )
                                .map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedAptService(s);
                                      setAptServiceSearch("");
                                      setShowAptServiceResults(false);
                                    }}
                                    className="w-full text-left p-2 hover:bg-slate-800/80 rounded-xl flex items-center justify-between transition-colors group cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-slate-950 group-hover:bg-[#E1B15F]/20 text-slate-400 group-hover:text-[#E1B15F] rounded-lg transition-colors">
                                        <Scissors size={13} />
                                      </div>
                                      <div>
                                        <p className="text-[11px] font-black text-white uppercase group-hover:text-elite-cyan-400 transition-colors">
                                          {s.name}
                                        </p>
                                        <p className="text-[8px] text-slate-400 font-bold">
                                          {s.duration || 30} min
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-black text-[#E1B15F] bg-[#E1B15F]/10 px-2 py-0.5 rounded-lg">
                                      R$ {s.price}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Opção de Adicionar Valor Após Conclusão do Corte / Valor Manual */}
                    <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-white/5 space-y-2.5 shadow-inner">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                            isPricePendingOnComplete 
                              ? "bg-[#E1B15F]/20 text-[#E1B15F] border border-[#E1B15F]/30" 
                              : "bg-slate-900 text-slate-400 border border-white/5"
                          }`}>
                            <DollarSign size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-white uppercase tracking-wider leading-tight">
                              Definir valor após o corte
                            </p>
                            <p className="text-[8px] text-slate-400 font-bold leading-tight mt-0.5">
                              {isPricePendingOnComplete
                                ? "O valor final será informado no momento da conclusão"
                                : "Definir valor fixo agora ou usar preço da tabela"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsPricePendingOnComplete(!isPricePendingOnComplete)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                            isPricePendingOnComplete ? "bg-[#E1B15F]" : "bg-slate-800"
                          }`}
                          title="Alternar definição de valor após conclusão"
                        >
                          <div
                            className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                              isPricePendingOnComplete ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {isPricePendingOnComplete ? (
                        <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[#E1B15F] text-[9px] font-black bg-[#E1B15F]/10 p-2.5 rounded-xl border border-[#E1B15F]/20 animate-in fade-in duration-200">
                          <Clock size={14} className="shrink-0 text-[#E1B15F]" />
                          <span>Valor em aberto — você digitará o valor final ao clicar em <strong>Finalizar</strong> no atendimento.</span>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <Input
                            label="VALOR MANUAL (OPCIONAL)"
                            name="cp"
                            type="number"
                            step="0.01"
                            placeholder={selectedAptService ? `Padrão: R$ ${selectedAptService.price}` : "Ex: R$ 50,00"}
                          />
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full h-12 text-[10px] font-black uppercase tracking-widest bg-elite-red-500 hover:bg-elite-red-600 shadow-lg shadow-elite-red-500/20 cursor-pointer">
                      CONFIRMAR AGENDAMENTO
                    </Button>
                  </form>
                </Card>
              </div>

              {/* Coluna Direita: Agenda Diária, Pesquisa de Cortes/Clientes e Métricas */}
              <div className="lg:col-span-7 xl:col-span-7 space-y-4">
                {/* Cabeçalho da Agenda do Dia com Métricas */}
                <div className="bg-slate-900/60 p-4 sm:p-5 rounded-[24px] border border-white/5 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black uppercase text-xs tracking-widest text-white flex items-center gap-2">
                        <Calendar size={15} className="text-elite-cyan-400" />
                        Agenda do Dia:{" "}
                        <span className="text-[#E1B15F]">
                          {new Date(selectedDate + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      </h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        {
                          appointments.filter(
                            (a) => a.date === selectedDate && !a.completed
                          ).length
                        }{" "}
                        atendimento(s) pendente(s) hoje
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white outline-none focus:border-elite-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Resumo Métrico Rápido do Dia */}
                  {(() => {
                    const dayApts = appointments.filter((a) => a.date === selectedDate);
                    const completed = dayApts.filter((a) => a.completed).length;
                    const pending = dayApts.filter((a) => !a.completed).length;
                    const totalRevenue = dayApts.reduce((acc, a) => acc + (a.finalPrice || 0), 0);

                    return (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-white/5 text-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase block">Total</span>
                          <span className="text-xs font-black text-white">{dayApts.length} cortes</span>
                        </div>
                        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-white/5 text-center">
                          <span className="text-[8px] font-black text-emerald-400 uppercase block">Concluídos</span>
                          <span className="text-xs font-black text-emerald-400">{completed}</span>
                        </div>
                        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-white/5 text-center">
                          <span className="text-[8px] font-black text-[#E1B15F] uppercase block">Previsto</span>
                          <span className="text-xs font-black text-[#E1B15F]">R$ {totalRevenue.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Campo de Pesquisa em Tempo Real de Cortes / Clientes / Horários */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquisar corte, cliente ou horário na agenda..."
                    value={agendaSearchTerm}
                    onChange={(e) => setAgendaSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/70 border border-white/10 focus:border-elite-cyan-400 rounded-2xl px-4 py-3 pl-10 text-white text-xs font-bold outline-none placeholder-slate-500 shadow-lg transition-all"
                  />
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  {agendaSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setAgendaSearchTerm("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Lista de Agendamentos */}
                {(() => {
                  const filteredAppointments = appointments
                    .filter((a) => {
                      const matchDate = a.date === selectedDate && !a.completed;
                      if (!matchDate) return false;
                      if (!agendaSearchTerm.trim()) return true;

                      const c = clients.find((cl) => cl.id === a.clientId);
                      const s = services.find((sv) => sv.id === a.serviceId);
                      const term = agendaSearchTerm.toLowerCase();
                      const clientMatch = c?.name?.toLowerCase().includes(term);
                      const serviceMatch = s?.name?.toLowerCase().includes(term);
                      const timeMatch = a.time?.toLowerCase().includes(term);

                      return clientMatch || serviceMatch || timeMatch;
                    })
                    .sort((a, b) => a.time.localeCompare(b.time));

                  if (filteredAppointments.length === 0) {
                    return (
                      <div className="p-10 text-center bg-slate-900/30 rounded-3xl border border-dashed border-white/5 space-y-2">
                        <Calendar size={28} className="mx-auto text-slate-600" />
                        <p className="font-black uppercase tracking-widest text-[10px] text-slate-500">
                          {agendaSearchTerm ? "Nenhum resultado para a pesquisa" : "Nenhum agendamento pendente para este dia"}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {agendaSearchTerm && (
                        <p className="text-[9px] font-black text-elite-cyan-400 uppercase tracking-wider px-1">
                          Mostrando {filteredAppointments.length} agendamento(s) para "{agendaSearchTerm}"
                        </p>
                      )}
                      {filteredAppointments.map((apt) => {
                        const c = clients.find((cl) => cl.id === apt.clientId);
                        const s = services.find((sv) => sv.id === apt.serviceId);
                        return (
                          <div
                            key={apt.id}
                            className="bg-slate-900/70 border border-white/5 p-4 sm:p-5 rounded-[24px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-xl transition-all hover:bg-slate-900 hover:border-elite-red-500/20"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <span className="text-2xl sm:text-3xl font-black text-white font-mono shrink-0">
                                {apt.time}
                              </span>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-12 w-12 rounded-xl bg-slate-950 border border-elite-red-500/30 overflow-hidden shadow-md flex items-center justify-center shrink-0">
                                  {c?.photo ? (
                                    <img
                                      src={c.photo}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <UserIcon
                                      className="text-slate-600"
                                      size={20}
                                    />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black text-sm uppercase text-white truncate leading-tight">
                                    {c?.name || "Cliente"}
                                  </p>
                                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                    <span className="text-[10px] font-black text-elite-cyan-400 uppercase truncate">
                                      {s?.name || "Corte"}
                                    </span>
                                    {apt.pricePending ? (
                                      <span className="text-[9px] font-black text-[#E1B15F] bg-[#E1B15F]/10 border border-[#E1B15F]/30 px-2 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
                                        <Clock size={10} />
                                        Valor a Definir
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-black text-[#E1B15F] font-mono">
                                        R$ {apt.finalPrice}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {finishingAptId === apt.id ? (
                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 p-2.5 bg-slate-950/95 rounded-2xl border border-[#E1B15F]/40 shadow-2xl animate-in slide-in-from-right duration-200">
                                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                    <span className="text-[10px] font-black text-[#E1B15F] uppercase pl-1">
                                      R$
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={
                                        finishingPriceMap[apt.id] !== undefined
                                          ? finishingPriceMap[apt.id]
                                          : (apt.pricePending
                                              ? (s?.price ? String(s.price) : "")
                                              : (apt.finalPrice > 0 ? String(apt.finalPrice) : (s?.price ? String(s.price) : "")))
                                      }
                                      onChange={(e) =>
                                        setFinishingPriceMap({
                                          ...finishingPriceMap,
                                          [apt.id]: e.target.value,
                                        })
                                      }
                                      placeholder={s?.price ? `Padrão: ${s.price}` : "0.00"}
                                      className="w-24 bg-slate-900 border border-white/10 focus:border-[#E1B15F] text-white text-xs font-black px-2.5 py-1.5 rounded-xl outline-none"
                                      autoFocus
                                    />
                                    {s?.price && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setFinishingPriceMap({
                                            ...finishingPriceMap,
                                            [apt.id]: String(s.price),
                                          })
                                        }
                                        className="text-[8px] font-black uppercase px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-[#E1B15F] rounded-lg border border-white/5 cursor-pointer"
                                        title={`Usar valor padrão de R$ ${s.price}`}
                                      >
                                        R${s.price}
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => {
                                        const rawVal = finishingPriceMap[apt.id];
                                        const valNum = rawVal !== undefined && rawVal !== ""
                                          ? Number(rawVal)
                                          : (apt.finalPrice > 0 ? apt.finalPrice : (s?.price || 0));
                                        toggleCompleteFlow(apt.id, true, isNaN(valNum) ? 0 : valNum);
                                      }}
                                      className="cursor-pointer text-[9px] font-black"
                                    >
                                      RECEBIDO
                                    </Button>
                                    <Button
                                      variant="warning"
                                      size="sm"
                                      onClick={() => {
                                        const rawVal = finishingPriceMap[apt.id];
                                        const valNum = rawVal !== undefined && rawVal !== ""
                                          ? Number(rawVal)
                                          : (apt.finalPrice > 0 ? apt.finalPrice : (s?.price || 0));
                                        toggleCompleteFlow(apt.id, false, isNaN(valNum) ? 0 : valNum);
                                      }}
                                      className="cursor-pointer text-[9px] font-black"
                                    >
                                      DÉBITO
                                    </Button>
                                    <button
                                      type="button"
                                      onClick={() => setFinishingAptId(null)}
                                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                                      title="Cancelar"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  {c?.phone && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cleanPhone = c.phone.replace(/\D/g, "");
                                        const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
                                        const msg = `Olá ${c.name}! Confirmando seu horário na ${session?.shopName || "Barbearia"} para hoje às ${apt.time} (${s?.name || "Corte"}). Te aguardamos!`;
                                        window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, "_blank");
                                      }}
                                      className="p-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 rounded-xl transition-all cursor-pointer"
                                      title="WhatsApp do Cliente"
                                    >
                                      <MessageSquare size={16} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => sendReminder(apt.id)}
                                    disabled={isSendingReminder === apt.id}
                                    className="p-2.5 bg-amber-500/10 text-[#E1B15F] rounded-xl hover:bg-[#E1B15F] hover:text-slate-950 transition-all cursor-pointer disabled:opacity-50"
                                    title="Enviar Lembrete Automático"
                                  >
                                    {isSendingReminder === apt.id ? (
                                      <Clock size={16} className="animate-spin" />
                                    ) : (
                                      <BellRing size={16} />
                                    )}
                                  </button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setFinishingAptId(apt.id)}
                                    className="cursor-pointer"
                                  >
                                    FINALIZAR
                                  </Button>
                                  <button
                                    onClick={async () => {
                                      if (!auth.currentUser) return;
                                      const userId = auth.currentUser.uid;
                                      try {
                                        await deleteDoc(
                                          doc(
                                            db,
                                            "users",
                                            userId,
                                            "appointments",
                                            apt.id,
                                          ),
                                        );
                                        showToast("Agendamento removido");
                                      } catch (err) {
                                        handleFirestoreError(
                                          err,
                                          OperationType.DELETE,
                                          `users/${userId}/appointments/${apt.id}`,
                                        );
                                      }
                                    }}
                                    className="p-2.5 text-slate-500 hover:text-red-400 cursor-pointer"
                                    title="Remover agendamento"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === Tab.Clients && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              <Card title="Novo Cliente VIP" icon={<Users size={18} />}>
                <div className="relative">
                  <form
                    className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end"
                    onSubmit={handleClientSubmit}
                  >
                    <Input
                      label="NOME COMPLETO"
                      name="n"
                      placeholder="Ex: Lucas Silva"
                      required
                    />
                    <Input
                      label="WHATSAPP (DDD)"
                      name="p"
                      placeholder="11999999999"
                      required
                    />
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-elite-cyan-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Camera size={12} /> FOTO DO CLIENTE
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:border-elite-red-500 transition-all group">
                          <Upload
                            size={16}
                            className="text-slate-500 group-hover:text-elite-red-500 mb-1 transition-colors"
                          />
                          <span className="text-[8px] font-black uppercase text-slate-500 group-hover:text-white transition-colors">
                            Selecionar
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handlePhotoChange(e)}
                          />
                        </label>
                        {clientPhotoBase64 && (
                          <div className="h-12 w-12 rounded-xl border-2 border-elite-red-500 overflow-hidden shadow-lg animate-in zoom-in duration-300">
                            <img
                              src={clientPhotoBase64}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-[54px]">
                      CADASTRAR CLIENTE
                    </Button>
                  </form>
                </div>
              </Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {clients.map((c) => (
                  <div
                    key={c.id}
                    className="bg-slate-950/40 border border-white/5 p-8 rounded-[40px] flex items-center justify-between group hover:bg-slate-900/60 transition-all shadow-xl hover:border-elite-red-500/20"
                  >
                    <div className="flex items-center gap-6">
                      <div className="h-16 w-16 rounded-3xl bg-slate-900 border-2 border-elite-red-500/20 flex items-center justify-center overflow-hidden shadow-inner">
                        {c.photo ? (
                          <img
                            src={c.photo}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl font-black text-elite-red-500 uppercase">
                            {c.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white uppercase tracking-tight italic">
                          {c.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge
                            variant="success"
                            className="bg-emerald-500/20 text-emerald-400 border-none"
                          >
                            {formatCurrency(c.totalSpent)} GASTO
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingClient(c)}
                        className="p-4 bg-elite-cyan-500/10 text-elite-cyan-400 rounded-2xl hover:bg-elite-cyan-500 hover:text-black transition-all"
                      >
                        <Edit3 size={24} />
                      </button>
                      <button
                        onClick={() =>
                          window.open(
                            `https://wa.me/55${c.phone.replace(/\D/g, "")}`,
                            "_blank",
                          )
                        }
                        className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all"
                      >
                        <MessageCircle size={24} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!auth.currentUser) return;
                          const userId = auth.currentUser.uid;
                          try {
                            await deleteDoc(
                              doc(db, "users", userId, "clients", c.id),
                            );
                            showToast("Cliente removido");
                          } catch (err) {
                            handleFirestoreError(
                              err,
                              OperationType.DELETE,
                              `users/${userId}/clients/${c.id}`,
                            );
                          }
                        }}
                        className="p-4 text-slate-800 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === Tab.Finance && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-10 rounded-[40px] shadow-2xl">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                    Receita Mensal
                  </p>
                  <p className="text-4xl font-black text-white">
                    {formatCurrency(stats.monthlyRev)}
                  </p>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 p-10 rounded-[40px] shadow-2xl">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">
                    Pendências
                  </p>
                  <p className="text-4xl font-black text-white">
                    {formatCurrency(
                      appointments
                        .filter((a) => a.completed && !a.paid)
                        .reduce((acc, a) => acc + Number(a.finalPrice || 0), 0),
                    )}
                  </p>
                </div>
                <div className="bg-elite-red-500/5 border border-elite-red-500/20 p-10 rounded-[40px] shadow-2xl">
                  <p className="text-[10px] font-black text-elite-red-500 uppercase tracking-widest mb-1">
                    Total Ajustes
                  </p>
                  <p className="text-4xl font-black text-white">
                    {formatCurrency(
                      adjustments.reduce((acc, a) => acc + Number(a.amount || 0), 0),
                    )}
                  </p>
                </div>
              </div>
              <Card title="Detalhamento Financeiro">
                <div className="flex gap-2 mb-8 bg-slate-950 p-1.5 rounded-2xl w-fit shadow-inner border border-white/5">
                  {["pending", "paid", "adjustments"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFinanceSubTab(t as any)}
                      className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${financeSubTab === t ? "bg-elite-red-500 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
                    >
                      {t === "pending"
                        ? "Pendentes"
                        : t === "paid"
                          ? "Ganhos"
                          : "Ajustes"}
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  {financeSubTab === "adjustments" ? (
                    adjustments.map((adj) => (
                      <div
                        key={adj.id}
                        className="p-6 bg-slate-900/40 border border-white/5 rounded-[32px] flex justify-between items-center group shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`h-12 w-12 rounded-2xl flex items-center justify-center ${adj.amount >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}
                          >
                            {adj.amount >= 0 ? (
                              <ArrowUpCircle size={24} />
                            ) : (
                              <ArrowDownCircle size={24} />
                            )}
                          </div>
                          <div>
                            <p className="font-black text-white uppercase text-sm italic mb-1">
                              {adj.reason}
                            </p>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              {adj.date}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <span
                            className={`text-2xl font-black ${adj.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                          >
                            {adj.amount >= 0 ? "+" : ""}
                            {formatCurrency(adj.amount)}
                          </span>
                          <button
                            onClick={async () => {
                              if (!auth.currentUser) return;
                              const userId = auth.currentUser.uid;
                              try {
                                await deleteDoc(
                                  doc(
                                    db,
                                    "users",
                                    userId,
                                    "adjustments",
                                    adj.id,
                                  ),
                                );
                              } catch (err) {
                                handleFirestoreError(
                                  err,
                                  OperationType.DELETE,
                                  `users/${userId}/adjustments/${adj.id}`,
                                );
                              }
                            }}
                            className="p-2 text-slate-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : appointments.filter(
                      (a) =>
                        a.completed &&
                        (financeSubTab === "paid" ? a.paid : !a.paid),
                    ).length > 0 ? (
                    appointments
                      .filter(
                        (a) =>
                          a.completed &&
                          (financeSubTab === "paid" ? a.paid : !a.paid),
                      )
                      .map((apt) => {
                        const c = clients.find((cl) => cl.id === apt.clientId);
                        return (
                          <div
                            key={apt.id}
                            className="p-6 bg-slate-900/40 border border-white/5 rounded-[32px] flex justify-between items-center group shadow-md hover:border-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-5">
                              <div
                                className={`h-14 w-14 rounded-2xl border-2 overflow-hidden flex items-center justify-center ${apt.paid ? "border-emerald-500/30" : "border-amber-500/30"}`}
                              >
                                {c?.photo ? (
                                  <img
                                    src={c.photo}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <UserIcon
                                    className="text-slate-800"
                                    size={24}
                                  />
                                )}
                              </div>
                              <div>
                                <p className="font-black text-white uppercase text-base italic leading-none mb-1">
                                  {c?.name || "Cliente Removido"}
                                </p>
                                <div className="flex items-center gap-3">
                                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    {apt.date} •{" "}
                                    {
                                      services.find(
                                        (s) => s.id === apt.serviceId,
                                      )?.name
                                    }
                                  </p>
                                  {apt.paid ? (
                                    <Badge
                                      variant="success"
                                      className="py-0.5 text-[8px]"
                                    >
                                      Pago
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="warning"
                                      className="py-0.5 text-[8px]"
                                    >
                                      Em Aberto
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-8">
                              <span className="text-2xl font-black text-elite-cyan-400 italic">
                                {formatCurrency(apt.finalPrice)}
                              </span>
                              {!apt.paid && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() =>
                                    toggleCompleteFlow(apt.id, true)
                                  }
                                >
                                  LIQUIDAR
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="p-20 text-center opacity-30">
                      <Receipt
                        size={48}
                        className="mx-auto mb-4 text-slate-700"
                      />
                      <p className="font-black uppercase text-[10px] tracking-widest">
                        Nenhum registro encontrado nesta categoria
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === Tab.Dashboard && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 p-8 rounded-[32px] shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-[10px] font-black text-elite-cyan-400 uppercase tracking-widest mb-1">
                        Caixa Hoje
                      </p>
                      <h3 className="text-4xl font-black text-white">
                        {formatCurrency(stats.dailyRev)}
                      </h3>
                    </div>
                    <Badge
                      variant={stats.goalPercent >= 100 ? "success" : "info"}
                    >
                      {stats.goalPercent}% DA META
                    </Badge>
                  </div>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.chartData}>
                        <defs>
                          <linearGradient
                            id="colorRev"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#ef4444"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#ef4444"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#1e293b"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#475569", fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#020617",
                            border: "none",
                            borderRadius: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="receita"
                          stroke="#ef4444"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorRev)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900/60 border border-white/5 p-8 rounded-[32px] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-elite-red-400 uppercase tracking-widest mb-1">
                        Cortes Hoje
                      </p>
                      <span className="text-4xl font-black text-white">
                        {stats.todayCuts}
                      </span>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-elite-red-500 flex items-center justify-center text-white shadow-lg">
                      <Scissors size={24} />
                    </div>
                  </div>
                  <Card title="Ajuste de Saldo">
                    <form
                      className="space-y-3"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const f = new FormData(e.target as HTMLFormElement);
                        const isAdd =
                          (e.nativeEvent as any).submitter.name === "add";
                        const amount = Number(f.get("a"));
                        const id = Date.now().toString();
                        const userId = auth.currentUser?.uid;
                        if (!userId) return;
                        try {
                          await setDoc(
                            doc(db, "users", userId, "adjustments", id),
                            {
                              id,
                              amount: isAdd ? amount : -amount,
                              reason: f.get("r") as string,
                              date: new Date().toISOString().split("T")[0],
                            },
                          );
                          (e.target as HTMLFormElement).reset();
                          showToast(
                            isAdd
                              ? "Entrada registrada!"
                              : "Retirada registrada!",
                          );
                        } catch (err) {
                          handleFirestoreError(
                            err,
                            OperationType.WRITE,
                            `users/${userId}/adjustments/${id}`,
                          );
                        }
                      }}
                    >
                      <Input
                        name="a"
                        type="number"
                        step="0.01"
                        placeholder="R$ 0,00"
                        required
                      />
                      <Input name="r" placeholder="Motivo" required />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          name="add"
                          type="submit"
                          variant="success"
                          size="sm"
                        >
                          ENTRADA
                        </Button>
                        <Button
                          name="remove"
                          type="submit"
                          variant="danger"
                          size="sm"
                        >
                          SAÍDA
                        </Button>
                      </div>
                    </form>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === Tab.Drinks && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <Card title="Novo Item de Bar" icon={<Beer size={16} />}>
                <div className="space-y-6">
                  <form
                    className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const id = Date.now().toString();
                      const userId = auth.currentUser?.uid;
                      if (!userId) return;
                      try {
                        await setDoc(doc(db, "users", userId, "drinks", id), {
                          id,
                          name: drinkFormName,
                          price: Number(drinkFormPrice),
                          stock: Number(drinkFormStock),
                        });
                        setDrinkFormName("");
                        setDrinkFormPrice("");
                        setDrinkFormStock("");
                        showToast("Produto registrado!");
                      } catch (err) {
                        handleFirestoreError(
                          err,
                          OperationType.WRITE,
                          `users/${userId}/drinks/${id}`,
                        );
                      }
                    }}
                  >
                    <Input
                      label="PRODUTO"
                      name="n"
                      placeholder="Cerveja/Água/Refri"
                      required
                      value={drinkFormName}
                      onChange={(e) => setDrinkFormName(e.target.value)}
                    />
                    <Input
                      label="PREÇO"
                      name="p"
                      type="number"
                      step="0.01"
                      required
                      value={drinkFormPrice}
                      onChange={(e) => setDrinkFormPrice(e.target.value)}
                    />
                    <Input
                      label="QTD INICIAL"
                      name="s"
                      type="number"
                      required
                      value={drinkFormStock}
                      onChange={(e) => setDrinkFormStock(e.target.value)}
                    />
                    <Button type="submit" className="w-full">
                      CADASTRAR
                    </Button>
                  </form>

                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 pb-1">
                      <Sparkles size={12} className="text-amber-500 animate-pulse" /> Sugestões de bebidas para cadastro rápido:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                      {[
                        { name: "Refri Coca-Cola Lata", price: "6.00", stock: "24", icon: "🥤" },
                        { name: "Refri Guaraná Lata", price: "6.00", stock: "24", icon: "🥤" },
                        { name: "Cerveja Heineken L.N.", price: "12.00", stock: "12", icon: "🍺" },
                        { name: "Cerveja Stella Artois", price: "10.00", stock: "12", icon: "🍺" },
                        { name: "Energético Red Bull", price: "15.00", stock: "12", icon: "⚡" },
                        { name: "Energético Monster", price: "14.00", stock: "12", icon: "⚡" },
                        { name: "Água Mineral com Gás", price: "4.50", stock: "12", icon: "💧" },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setDrinkFormName(item.name);
                            setDrinkFormPrice(item.price);
                            setDrinkFormStock(item.stock);
                            showToast(`${item.name} selecionado!`);
                          }}
                          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950 border border-white/5 hover:border-[#E1B15F]/30 hover:bg-slate-900 text-center transition-all cursor-pointer group"
                        >
                          <span className="text-lg mb-1 group-hover:scale-110 transition-transform">{item.icon}</span>
                          <span className="text-[8px] font-black uppercase text-slate-400 group-hover:text-white mb-1 tracking-wider leading-tight truncate w-full">
                            {item.name}
                          </span>
                          <span className="text-[9px] font-bold text-[#E1B15F]">
                            R$ {item.price}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {drinks.map((d) => {
                  const isEditing = editingDrinkId === d.id;
                  return (
                    <div
                      key={d.id}
                      className={`bg-slate-900/40 border p-8 rounded-[32px] shadow-xl transition-all ${
                        isEditing
                          ? "border-[#E1B15F] bg-slate-950/80 shadow-[#E1B15F]/5"
                          : "border-white/5 group hover:border-[#E1B15F]/30"
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-4 animate-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[9px] font-black text-[#E1B15F] uppercase tracking-widest flex items-center gap-1.5">
                              <Edit3 size={12} /> Editando Item
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingDrinkId(null)}
                              className="text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-wider"
                            >
                              Cancelar
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                Nome do Item
                              </label>
                              <input
                                type="text"
                                value={editingDrinkName}
                                onChange={(e) => setEditingDrinkName(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#E1B15F] outline-none"
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                  Preço (R$)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editingDrinkPrice}
                                  onChange={(e) => setEditingDrinkPrice(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#E1B15F] outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                  Qtd Estoque
                                </label>
                                <input
                                  type="number"
                                  value={editingDrinkStock}
                                  onChange={(e) => setEditingDrinkStock(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#E1B15F] outline-none"
                                />
                              </div>
                            </div>
                            
                            <div className="pt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!auth.currentUser || !editingDrinkName.trim()) return;
                                  const userId = auth.currentUser.uid;
                                  try {
                                    await updateDoc(
                                      doc(db, "users", userId, "drinks", d.id),
                                      {
                                        name: editingDrinkName,
                                        price: Number(editingDrinkPrice),
                                        stock: Number(editingDrinkStock),
                                      },
                                    );
                                    setEditingDrinkId(null);
                                    showToast("Item atualizado!");
                                  } catch (err) {
                                    handleFirestoreError(
                                      err,
                                      OperationType.UPDATE,
                                      `users/${userId}/drinks/${d.id}`,
                                    );
                                  }
                                }}
                                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingDrinkId(null)}
                                className="px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                Voltar
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-6">
                              <h4 className="text-lg font-black text-white uppercase leading-tight italic truncate pr-2" title={d.name}>
                                {d.name}
                              </h4>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDrinkId(d.id);
                                    setEditingDrinkName(d.name);
                                    setEditingDrinkPrice(d.price);
                                    setEditingDrinkStock(d.stock);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-[#E1B15F] hover:bg-amber-500/10 rounded-lg transition-all"
                                  title="Editar item"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteDrink(e, d.id)}
                                  className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                  title="Remover item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mb-6">
                              <div>
                                <p className="text-2xl font-black text-elite-cyan-400 leading-none mb-2">
                                  {formatCurrency(d.price)}
                                </p>
                                <Badge variant={d.stock <= 5 ? "danger" : "info"}>
                                  {d.stock} UN NO ESTOQUE
                                </Badge>
                              </div>
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!auth.currentUser) return;
                                    const userId = auth.currentUser.uid;
                                    try {
                                      await updateDoc(
                                        doc(db, "users", userId, "drinks", d.id),
                                        { stock: d.stock + 1 },
                                      );
                                    } catch (err) {
                                      handleFirestoreError(
                                        err,
                                        OperationType.UPDATE,
                                        `users/${userId}/drinks/${d.id}`,
                                      );
                                    }
                                  }}
                                  className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-bold text-xs"
                                >
                                  <Plus size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!auth.currentUser) return;
                                    const userId = auth.currentUser.uid;
                                    try {
                                      await updateDoc(
                                        doc(db, "users", userId, "drinks", d.id),
                                        { stock: Math.max(0, d.stock - 1) },
                                      );
                                    } catch (err) {
                                      handleFirestoreError(
                                        err,
                                        OperationType.UPDATE,
                                        `users/${userId}/drinks/${d.id}`,
                                      );
                                    }
                                  }}
                                  className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-bold text-xs"
                                >
                                  <Minus size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            variant="success"
                            className="w-full"
                            onClick={() => sellDrink(d)}
                            disabled={d.stock <= 0}
                          >
                            <ShoppingCart size={18} className="mr-2" /> VENDER AGORA
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === Tab.Inventory && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <Card title="Gestão de Insumos" icon={<Box size={16} />}>
                <form
                  className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.target as HTMLFormElement);
                    const id = Date.now().toString();
                    const userId = auth.currentUser?.uid;
                    if (!userId) return;
                    try {
                      await setDoc(doc(db, "users", userId, "materials", id), {
                        id,
                        name: f.get("n") as string,
                        quantity: Number(f.get("q")),
                        minQuantity: Number(f.get("mq")),
                        unit: "un",
                      });
                      (e.target as HTMLFormElement).reset();
                      showToast("Insumo cadastrado!");
                    } catch (err) {
                      handleFirestoreError(
                        err,
                        OperationType.WRITE,
                        `users/${userId}/materials/${id}`,
                      );
                    }
                  }}
                >
                  <Input
                    label="MATERIAL"
                    name="n"
                    placeholder="Lâminas/Golas/Capa"
                    required
                  />
                  <Input label="QTD ATUAL" name="q" type="number" required />
                  <Input
                    label="ESTOQUE MÍNIMO"
                    name="mq"
                    type="number"
                    required
                  />
                  <Button type="submit" className="w-full">
                    SALVAR NO ESTOQUE
                  </Button>
                </form>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.map((m) => (
                  <div
                    key={m.id}
                    className={`p-8 rounded-[32px] border transition-all shadow-xl ${m.quantity <= m.minQuantity ? "bg-red-500/5 border-red-500/20" : "bg-slate-900/40 border-white/5"}`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <h4 className="text-lg font-black text-white uppercase">
                        {m.name}
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (!auth.currentUser) return;
                            const userId = auth.currentUser.uid;
                            try {
                              await updateDoc(
                                doc(db, "users", userId, "materials", m.id),
                                { quantity: m.quantity + 1 },
                              );
                            } catch (err) {
                              handleFirestoreError(
                                err,
                                OperationType.UPDATE,
                                `users/${userId}/materials/${m.id}`,
                              );
                            }
                          }}
                          className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            if (!auth.currentUser) return;
                            const userId = auth.currentUser.uid;
                            try {
                              await updateDoc(
                                doc(db, "users", userId, "materials", m.id),
                                { quantity: Math.max(0, m.quantity - 1) },
                              );
                            } catch (err) {
                              handleFirestoreError(
                                err,
                                OperationType.UPDATE,
                                `users/${userId}/materials/${m.id}`,
                              );
                            }
                          }}
                          className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all"
                        >
                          <Minus size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteMaterial(e, m.id)}
                          className="p-2 bg-slate-800/50 text-slate-500 hover:text-red-500 rounded-lg transition-all ml-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-4xl font-black ${m.quantity <= m.minQuantity ? "text-red-500" : "text-elite-cyan-400"}`}
                      >
                        {m.quantity}
                      </span>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                          Mínimo Ideal
                        </p>
                        <span className="text-sm font-black text-white">
                          {m.minQuantity} {m.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === Tab.Profile && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
              <Card
                title="Configurações do Perfil"
                icon={<Settings size={16} />}
              >
                <div className="space-y-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative group h-32 w-32 rounded-[40px] border-4 border-elite-red-500 overflow-hidden shadow-2xl cursor-pointer">
                      <img
                        src={session?.profileImage}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-300"
                      />
                      <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer text-white">
                        <Upload size={24} className="mb-1 text-elite-red-500 animate-bounce" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Alterar Foto</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const base64 = reader.result as string;
                                setSession((s) => s ? { ...s, profileImage: base64 } : null);
                                showToast("Foto de perfil atualizada!");
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      Clique na imagem para trocar a foto de perfil
                    </p>
                  </div>
                  <div className="space-y-6">
                    <Input
                      label="NOME DA BARBEARIA"
                      value={session?.shopName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSession((s) => (s ? { ...s, shopName: val } : null));
                      }}
                    />
                    <Input
                      label="WHATSAPP DE CONTATO"
                      value={session?.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSession((s) => (s ? { ...s, phone: val } : null));
                      }}
                    />
                    <Input
                      label="META DE FATURAMENTO MENSAL (R$)"
                      type="number"
                      value={session?.monthlyGoal}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSession((s) =>
                          s ? { ...s, monthlyGoal: val } : null,
                        );
                      }}
                    />
                  </div>
                  <div className="bg-elite-cyan-500/5 border border-elite-cyan-500/10 p-6 rounded-2xl">
                    <p className="text-[10px] font-black text-elite-cyan-400 uppercase tracking-widest text-center">
                      As informações acima são salvas automaticamente.
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                title="Link de Agendamento Online"
                icon={<ExternalLink size={16} />}
                className="border-elite-cyan-500/30"
              >
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed text-center">
                    Compartilhe este link oficial com seus clientes para que eles agendem pelo celular em poucos toques.
                  </p>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 rounded-xl border border-white/5 overflow-hidden">
                      <Smartphone size={14} className="text-elite-cyan-400 shrink-0" />
                      <code className="text-[10px] text-elite-cyan-300 font-mono truncate flex-1 select-all">
                        {window.location.origin}/?barberId={auth.currentUser?.uid || "offline_demo"}
                      </code>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="cyan"
                        className="h-10 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                        onClick={() => {
                          const url = `${window.location.origin}/?barberId=${auth.currentUser?.uid || "offline_demo"}`;
                          navigator.clipboard.writeText(url);
                          showToast("Link copiado para a área de transferência!");
                        }}
                      >
                        <Copy size={13} /> COPIAR LINK
                      </Button>

                      <Button
                        size="sm"
                        variant="lilac"
                        className="h-10 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 border-none text-white"
                        onClick={() => {
                          const url = `${window.location.origin}/?barberId=${auth.currentUser?.uid || "offline_demo"}`;
                          const shop = session?.shopName || "Barbearia";
                          const text = `Olá! 💈 Agende seu horário na ${shop} de forma rápida pelo nosso link exclusivo:\n\n${url}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                        }}
                      >
                        <MessageCircle size={13} /> NO WHATSAPP
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 border-slate-700 hover:border-slate-500 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                        onClick={() => {
                          const url = `${window.location.origin}/?barberId=${auth.currentUser?.uid || "offline_demo"}`;
                          window.open(url, "_blank");
                        }}
                      >
                        <ExternalLink size={13} /> ABRIR LINK
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <BusinessHoursCard
                session={session}
                setSession={setSession}
                showToast={showToast}
              />

              <Card
                title="Backup & Sincronização"
                icon={<Database size={16} />}
              >
                <div className="space-y-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed text-center">
                    Para usar em outros navegadores ou computadores, exporte o
                    backup e importe-o no novo local.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="cyan"
                      className="w-full flex gap-2"
                      onClick={handleExportData}
                    >
                      <Download size={16} /> EXPORTAR BACKUP
                    </Button>
                    <div className="relative">
                      <Button variant="secondary" className="w-full flex gap-2">
                        <Upload size={16} /> IMPORTAR BACKUP
                      </Button>
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept=".json"
                        onChange={handleImportData}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] font-bold text-elite-cyan-400 uppercase tracking-widest text-center mb-4">
                      Migração do Sistema Antigo
                    </p>
                    <Button
                      variant="ghost"
                      className="w-full border border-elite-cyan-500/20 text-elite-cyan-400 hover:bg-elite-cyan-500/10"
                      onClick={async () => {
                        if (!auth.currentUser || !session) return;
                        setIsSaving(true);
                        const migrated = await migrateLocalData(
                          auth.currentUser.uid,
                          session.username,
                        );
                        setIsSaving(false);
                        if (migrated) {
                          showToast("Dados migrados com sucesso!");
                        } else {
                          showToast(
                            "Nenhum dado local encontrado para migrar.",
                            "info",
                          );
                        }
                      }}
                    >
                      <RefreshCw
                        size={16}
                        className={isSaving ? "animate-spin" : ""}
                      />{" "}
                      FORÇAR MIGRAÇÃO DE DADOS LOCAIS
                    </Button>
                  </div>
                </div>
              </Card>

              <Card title="Sistema & Suporte" icon={<Activity size={16} />}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                        Versão Atual
                      </p>
                      <p className="text-xs font-black text-white">
                        {CURRENT_VERSION}
                      </p>
                    </div>
                    <Badge variant="success" className="text-[8px]">
                      ESTÁVEL
                    </Badge>
                  </div>

                  <div className="p-4 bg-elite-cyan-500/5 border border-elite-cyan-500/10 rounded-2xl text-center">
                    <p className="text-[9px] font-black uppercase text-elite-cyan-400 tracking-wider">
                      Acesso Master Ativado
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                      Este terminal está configurado para acesso total
                      permanente sem necessidade de logins.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === Tab.Admin && isAdmin && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {!isAdminUnlocked ? (
                <div className="max-w-md mx-auto bg-slate-900/40 border border-white/5 p-8 rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300">
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="p-4 bg-elite-red-500/10 text-elite-red-500 rounded-3xl border border-elite-red-500/20">
                      <Lock size={36} className="text-elite-red-500 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Área Restrita</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Insira a senha de acesso administrativo</p>
                    </div>
                    <form onSubmit={handleVerifyAdminPassword} className="w-full space-y-4">
                      <div className="relative">
                        <input 
                          type="password"
                          value={adminInputPassword}
                          onChange={(e) => {
                            setAdminInputPassword(e.target.value);
                            if (adminPasswordError) setAdminPasswordError("");
                          }}
                          placeholder="••••••"
                          className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-center text-lg font-black text-white placeholder-slate-700 tracking-[0.3em] focus:border-elite-red-500 focus:ring-1 focus:ring-elite-red-500 outline-none transition-all"
                          autoFocus
                        />
                      </div>
                      {adminPasswordError && (
                        <p className="text-[10px] font-black uppercase text-rose-500 tracking-wider">
                          {adminPasswordError}
                        </p>
                      )}
                      <Button type="submit" variant="ghost" className="w-full border border-white/10 text-white hover:bg-white/5 py-4 text-[10px] font-black uppercase tracking-widest">
                        DESBLOQUEAR PAINEL
                      </Button>
                    </form>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-3xl mb-8">
                    <div className="flex items-center gap-3">
                      <Unlock size={16} className="text-emerald-400" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Acesso Administrativo Liberado</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsAdminUnlocked(false)} 
                      className="text-slate-500 hover:text-elite-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors border border-white/5 bg-slate-950 px-4 py-2 rounded-xl text-xs font-black"
                    >
                      <Lock size={12} /> Bloquear Painel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Configuração Global" icon={<Settings size={18} />}>
                  <form
                    className="space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.target as HTMLFormElement);
                      try {
                        await setDoc(doc(db, "system", "config"), {
                          version: f.get("v"),
                          updateMessage: f.get("m"),
                          updatedAt: new Date().toISOString(),
                        });
                        showToast("Configuração global salva!");
                      } catch (err) {
                        showToast("Erro ao salvar config", "error");
                      }
                    }}
                  >
                    <Input
                      label="VERSÃO DO SISTEMA"
                      name="v"
                      defaultValue={systemConfig?.version || CURRENT_VERSION}
                    />
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-elite-cyan-400 uppercase ml-1">
                        MENSAGEM DE ATUALIZAÇÃO
                      </label>
                      <textarea
                        name="m"
                        defaultValue={systemConfig?.updateMessage || ""}
                        className="w-full bg-slate-950/40 border border-white/10 rounded-xl p-4 text-white text-xs font-medium focus:border-elite-red-500 outline-none"
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      SALVAR CONFIGURAÇÃO
                    </Button>
                  </form>
                </Card>
                <div className="md:col-span-2 bg-slate-900/40 border border-white/5 p-8 rounded-[40px] shadow-xl">
                  <h3 className="text-xl font-black text-white italic uppercase mb-6 flex items-center gap-3">
                    <Users size={24} className="text-elite-red-500" />
                    Base de Usuários ({allUsers.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {allUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl flex items-center gap-4 group hover:border-elite-cyan-500/30 transition-all"
                      >
                        <div className="h-12 w-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {u.profileImage ? (
                            <img
                              src={u.profileImage}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserIcon size={20} className="text-slate-700" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white uppercase italic truncate">
                            {u.shopName || u.username}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase truncate">
                            {u.username}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            window.open(
                              `${window.location.origin}${window.location.pathname}?barberId=${u.id}`,
                              "_blank",
                            )
                          }
                          className="ml-auto p-2 text-slate-500 hover:text-elite-cyan-400 transition-colors"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[40px] shadow-xl">
                <h3 className="text-xl font-black text-white italic uppercase mb-6 flex items-center gap-3">
                  <Database size={24} className="text-elite-cyan-400" />
                  Manutenção & Logs
                </h3>
                <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 border-dashed text-center">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-loose">
                    Painel Administrativo Restrito
                    <br />
                    <span className="text-elite-red-500">
                      Acesso Total Ativado
                    </span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

          {activeTab === Tab.Reports && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl flex items-center justify-between gap-6 flex-wrap shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-elite-red-500/10 text-elite-red-500 rounded-xl">
                    <Filter size={20} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                      Análise Mensal
                    </h4>
                    <p className="text-xs font-bold text-white uppercase">
                      Selecione o período de interesse
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-xl px-6 py-3 text-white text-xs font-black uppercase outline-none focus:border-elite-red-500 transition-all"
                  />
                  <button
                    onClick={handleExportExcelYear}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
                    title="Exportar Relatório Excel/CSV Completo do Ano de Referência"
                  >
                    <Download size={14} />
                    Exportar Excel Anual ({reportMonth.split("-")[0]})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[32px] shadow-xl">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Cortes Feitos
                  </p>
                  <h3 className="text-4xl font-black text-white">
                    {stats.reportCuts}
                  </h3>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-[32px] shadow-xl">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                    Dinheiro Rendido
                  </p>
                  <h3 className="text-4xl font-black text-white">
                    {formatCurrency(stats.reportRevenue)}
                  </h3>
                </div>
                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[32px] shadow-xl">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Produtividade Ano
                  </p>
                  <h3 className="text-4xl font-black text-white">
                    {stats.yearlyCuts}
                  </h3>
                </div>
                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[32px] shadow-xl">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Atingimento Meta
                  </p>
                  <h3 className="text-4xl font-black text-white">
                    {stats.goalPercent}%
                  </h3>
                </div>
              </div>

              <Card title="Desempenho Semestral" className="shadow-2xl">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthlyReportData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#1e293b"
                      />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#475569",
                          fontSize: 10,
                          fontWeight: "bold",
                        }}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                        contentStyle={{
                          backgroundColor: "#020617",
                          border: "1px solid #1e293b",
                          borderRadius: "12px",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#ef4444"
                        radius={[6, 6, 0, 0]}
                        barSize={35}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {activeTab === Tab.Services && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              <Card title="Serviços Oferecidos" icon={<Scissors size={18} />}>
                <form
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.target as HTMLFormElement);
                    const id = Date.now().toString();
                    const userId = auth.currentUser?.uid;
                    if (!userId) return;
                    try {
                      await setDoc(doc(db, "users", userId, "services", id), {
                        id,
                        name: f.get("n") as string,
                        price: Number(f.get("p")),
                        duration: 30,
                      });
                      (e.target as HTMLFormElement).reset();
                      showToast("Serviço adicionado!");
                    } catch (err) {
                      handleFirestoreError(
                        err,
                        OperationType.WRITE,
                        `users/${userId}/services/${id}`,
                      );
                    }
                  }}
                >
                  <Input
                    label="NOME DO SERVIÇO"
                    name="n"
                    placeholder="Corte degradê"
                    required
                  />
                  <Input
                    label="VALOR (R$)"
                    name="p"
                    type="number"
                    step="0.01"
                    required
                  />
                  <Button type="submit" className="w-full">
                    ADICIONAR SERVIÇO
                  </Button>
                </form>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {services.map((s) => {
                  const isEditing = editingServiceId === s.id;
                  if (isEditing) {
                    return (
                      <div
                        key={s.id}
                        className="bg-slate-900/60 border border-elite-cyan-500/20 p-8 rounded-[40px] transition-all shadow-xl animate-in zoom-in duration-200"
                      >
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black tracking-widest text-elite-cyan-400 uppercase block mb-2">
                              Editar Nome
                            </label>
                            <input
                              type="text"
                              className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white uppercase focus:border-elite-cyan-500 focus:ring-1 focus:ring-elite-cyan-500 outline-none transition-all"
                              value={editingServiceName}
                              onChange={(e) =>
                                setEditingServiceName(e.target.value)
                              }
                              placeholder="Ex: Corte Degradê"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black tracking-widest text-elite-cyan-400 uppercase block mb-2">
                              Editar Valor (R$)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white focus:border-elite-cyan-500 focus:ring-1 focus:ring-elite-cyan-500 outline-none transition-all"
                              value={editingServicePrice}
                              onChange={(e) =>
                                setEditingServicePrice(Number(e.target.value))
                              }
                              placeholder="Ex: 40.00"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => handleEditServiceSave(s.id)}
                              className="flex-1 bg-elite-cyan-500 hover:bg-elite-cyan-600 text-slate-950 font-black text-[10px] uppercase py-3 rounded-2xl flex items-center justify-center gap-1 transition-all"
                            >
                              <Check size={14} /> Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingServiceId(null)}
                              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase py-3 rounded-2xl flex items-center justify-center gap-1 transition-all"
                            >
                              <X size={14} /> Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={s.id}
                      className="bg-slate-900/40 border border-white/5 p-8 rounded-[40px] hover:border-elite-red-500/30 transition-all shadow-xl group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-lg font-black text-white uppercase tracking-tight">
                            {s.name}
                          </h4>
                          <div className="flex gap-3 items-center opacity-40 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingServiceId(s.id);
                                setEditingServiceName(s.name);
                                setEditingServicePrice(s.price);
                              }}
                              className="text-slate-400 hover:text-elite-cyan-400 transition-colors"
                              title="Editar serviço"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={async () => {
                                if (!auth.currentUser) return;
                                const userId = auth.currentUser.uid;
                                try {
                                  await deleteDoc(
                                    doc(db, "users", userId, "services", s.id),
                                  );
                                  showToast("Serviço removido");
                                } catch (err) {
                                  handleFirestoreError(
                                    err,
                                    OperationType.DELETE,
                                    `users/${userId}/services/${s.id}`,
                                  );
                                }
                              }}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                              title="Remover serviço"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-3xl font-black text-elite-cyan-400">
                          {formatCurrency(s.price)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === Tab.Marketing && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <Card
                title="Assistente de Marketing IA"
                icon={<Wand2 size={16} />}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Input
                      label="OBJETIVO DA CAMPANHA"
                      value={campaignGoal}
                      onChange={(e) => {
                        setCampaignGoal(e.target.value);
                      }}
                      placeholder="Ex: Promoção de terça-feira corte + barba R$ 50"
                    />
                    <Button
                      variant="lilac"
                      className="w-full py-4"
                      onClick={async () => {
                        if (!campaignGoal)
                          return showToast(
                            "Descreva o objetivo da campanha!",
                            "info",
                          );
                        setIsGeneratingMessage(true);
                        const msg = await GeminiService.generateCampaignMessage(
                          session?.shopName || "Barbearia",
                          campaignGoal,
                        );
                        setMarketingMsg(msg);
                        setIsGeneratingMessage(false);
                        showToast("Mensagem gerada!");
                      }}
                      isLoading={isGeneratingMessage}
                    >
                      <Sparkles size={16} className="mr-2" /> GERAR TEXTO
                      IRRESISTÍVEL
                    </Button>
                    <textarea
                      className="w-full h-40 bg-slate-950/40 border border-white/10 rounded-2xl p-6 text-white text-xs font-medium focus:border-elite-red-500 outline-none transition-all shadow-inner"
                      value={marketingMsg}
                      onChange={(e) => {
                        setMarketingMsg(e.target.value);
                      }}
                      placeholder="A mensagem da IA aparecerá aqui..."
                    />
                  </div>
                  <div className="bg-slate-900/40 border border-white/5 rounded-[32px] p-6 shadow-xl">
                    <h4 className="font-black uppercase text-[10px] text-elite-cyan-400 mb-6 flex items-center gap-2 tracking-widest">
                      <Users size={14} /> Enviar para Lista VIP
                    </h4>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {clients.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-white/5 group hover:border-emerald-500/30 transition-all"
                        >
                          <span className="font-black text-[10px] text-white uppercase tracking-wider">
                            {c.name}
                          </span>
                          <button
                            onClick={() => {
                              const msg = marketingMsg.replace(
                                "[NOME DO CLIENTE]",
                                c.name,
                              );
                              window.open(
                                `https://wa.me/55${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
                                "_blank",
                              );
                            }}
                            className="p-2 text-emerald-500 hover:scale-125 transition-transform"
                          >
                            <MessageCircle size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* MODAL DE RECUSA DE AGENDAMENTO COM MOTIVO */}
      {showRejectModal && rejectingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-500/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400 font-black italic uppercase text-base">
                <div className="p-2 bg-red-500/10 rounded-xl">
                  <X size={18} />
                </div>
                Recusar Solicitação
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingRequestId(null);
                  setRejectReasonText("");
                }}
                className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Informe o motivo da recusa. O cliente receberá uma mensagem no WhatsApp com esta explicação:
            </p>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Motivos Frequentes:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Horário já ocupado na barbearia",
                  "Pausa para almoço / Intervalo",
                  "Fora do horário de expediente",
                  "Imprevisto / Barbeiro indisponível",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectReasonText(reason)}
                    className={`text-[9px] px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      rejectReasonText === reason
                        ? "bg-red-500 text-white shadow-sm"
                        : "bg-slate-950 hover:bg-slate-800 text-slate-300 border border-white/5"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Mensagem personalizada (opcional):
              </label>
              <textarea
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                placeholder="Ex: Infelizmente já temos atendimento nesse horário. Que tal 15:30?"
                className="w-full h-24 bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-slate-600 focus:border-red-500 outline-none resize-none transition-all"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingRequestId(null);
                  setRejectReasonText("");
                }}
                className="w-1/2 h-11 text-[10px] font-black uppercase tracking-wider"
              >
                CANCELAR
              </Button>
              <Button
                type="button"
                onClick={() => handleRejectWithReason(rejectingRequestId, rejectReasonText)}
                isLoading={processingRequestId === rejectingRequestId}
                className="w-1/2 h-11 text-[10px] font-black uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white border-none shadow-lg shadow-red-500/20"
              >
                CONFIRMAR RECUSA
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface PublicBookingViewProps {
  barberIdFromUrl: string;
}

const PublicBookingView: React.FC<PublicBookingViewProps> = ({ barberIdFromUrl }) => {
  const [clientSession, setClientSession] = useState<{ name: string; phone: string } | null>(() => {
    const savedName = localStorage.getItem("bk_client_name");
    const savedPhone = localStorage.getItem("bk_client_phone");
    return savedName && savedPhone ? { name: savedName, phone: savedPhone } : null;
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");

  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const isPrevDisabled = useMemo(() => {
    const now = new Date();
    return currentYear < now.getFullYear() || (currentYear === now.getFullYear() && currentMonth <= now.getMonth());
  }, [currentMonth, currentYear]);

  // Dynamic calendar generator
  const calendarCells = useMemo(() => {
    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfWeek = (y: number, m: number) => new Date(y, m, 1).getDay();

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayIndex = getFirstDayOfWeek(currentYear, currentMonth);

    // Previous month padding
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthDays = getDaysInMonth(prevYear, prevMonth);
    
    const paddingDays = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      paddingDays.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        dateStr: "",
      });
    }

    // Current month days
    const currentDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(currentMonth + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${currentYear}-${mStr}-${dStr}`;
      currentDays.push({
        day: d,
        isCurrentMonth: true,
        dateStr,
      });
    }

    // Next month padding to fill grid
    const totalSlots = paddingDays.length + currentDays.length;
    const nextMonthPaddingCount = (7 - (totalSlots % 7)) % 7;
    const nextDays = [];
    for (let d = 1; d <= nextMonthPaddingCount; d++) {
      nextDays.push({
        day: d,
        isCurrentMonth: false,
        dateStr: "",
      });
    }

    return [...paddingDays, ...currentDays, ...nextDays];
  }, [currentMonth, currentYear]);

  const [name, setName] = useState(clientSession?.name || "");
  const [phone, setPhone] = useState(clientSession?.phone || "");
  const [phoneFilter, setPhoneFilter] = useState(clientSession?.phone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"booking" | "my-bookings">("booking");
  const [myRequests, setMyRequests] = useState<any[]>([]);

  const [bookingBarber, setBookingBarber] = useState<any>(null);
  const [bookingServices, setBookingServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentRequests, setAppointmentRequests] = useState<any[]>([]);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync state if clientSession changes
  useEffect(() => {
    if (clientSession) {
      setName(clientSession.name);
      setPhone(clientSession.phone);
      setPhoneFilter(clientSession.phone);
    }
  }, [clientSession]);

  // Load bookings when viewMode or clientSession changes
  useEffect(() => {
    if (viewMode === "my-bookings" && clientSession?.phone) {
      setPhoneFilter(clientSession.phone);
    }
  }, [viewMode, clientSession]);

  useEffect(() => {
    if (phoneFilter && barberIdFromUrl) {
      fetchMyBookings();
    }
  }, [phoneFilter, barberIdFromUrl]);

  // Load Barber profile and services
  useEffect(() => {
    if (!barberIdFromUrl) return;
    setBookingError(null);

    // Initial load
    getDoc(doc(db, "users", barberIdFromUrl))
      .then((snap) => {
        if (snap.exists()) {
          setBookingBarber(snap.data());
        }
      })
      .catch((err) => {
        console.error("Erro no getDoc inicial:", err);
      });

    // Realtime listeners
    const unsubBarber = onSnapshot(
      doc(db, "users", barberIdFromUrl),
      (snap) => {
        if (snap.exists()) {
          setBookingBarber(snap.data());
        } else {
          console.error("Barbeiro não encontrado no Firestore");
          setBookingError("Barbeiro não encontrado. Verifique o link.");
        }
      },
      (err) => {
        console.error("Erro ao carregar perfil do barbeiro:", err);
        setBookingError("Erro de conexão ou permissão ao carregar perfil.");
      }
    );

    const unsubServices = onSnapshot(
      collection(db, "users", barberIdFromUrl, "services"),
      (snap) => {
        const svcs = snap.docs.map((d) => d.data() as Service);
        setBookingServices(svcs);
      },
      (err) => {
        console.error("Erro ao carregar serviços do barbeiro:", err);
      }
    );

    // Load barber’s appointments to check for real-time collisions
    const unsubAppointments = onSnapshot(
      collection(db, "users", barberIdFromUrl, "appointments"),
      (snap) => {
        setAppointments(snap.docs.map((d) => d.data() as Appointment));
      },
      (err) => {
        console.error("Erro ao carregar agendamentos do barbeiro:", err);
      }
    );

    // Load barber's requests (pending) to check for pending slot collisions
    const unsubRequests = onSnapshot(
      collection(db, "users", barberIdFromUrl, "requests"),
      (snap) => {
        setAppointmentRequests(
          snap.docs
            .map((d) => d.data())
            .filter((r) => r.status === "pending")
        );
      },
      (err) => {
        console.error("Erro ao carregar solicitações do barbeiro:", err);
      }
    );

    return () => {
      unsubBarber();
      unsubServices();
      unsubAppointments();
      unsubRequests();
    };
  }, [barberIdFromUrl]);

  const fetchMyBookings = async () => {
    const cleanPhone = phoneFilter.replace(/\D/g, "");
    if (!cleanPhone || !barberIdFromUrl) return;
    try {
      const q = query(
        collection(db, "users", barberIdFromUrl, "requests"),
        where("clientPhone", "==", cleanPhone),
      );
      onSnapshot(q, (snap) => {
        setMyRequests(
          snap.docs
            .map((d) => d.data())
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      });
    } catch (err) {
      console.error("Error fetching my bookings:", err);
    }
  };

  const generateTimeSlots = (
    date: string,
    open: string,
    close: string,
    intervalStart: string | undefined | null,
    intervalEnd: string | undefined | null,
    serviceDuration: number = 30,
  ) => {
    const slots: string[] = [];
    const openMin = timeToMinutes(open || "08:00");
    let closeMin = timeToMinutes(close || "19:00");
    if (closeMin <= openMin) {
      closeMin += 24 * 60;
    }

    const hasInt = Boolean(
      intervalStart &&
      intervalEnd &&
      intervalStart.trim() &&
      intervalEnd.trim() &&
      intervalStart.trim() !== intervalEnd.trim()
    );

    const intStartMin = hasInt ? timeToMinutes(intervalStart) : -1;
    const intEndMin = hasInt ? timeToMinutes(intervalEnd) : -1;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const nowMin = now.getHours() * 60 + now.getMinutes() + 30;

    for (let currentMin = openMin; currentMin < closeMin; currentMin += 30) {
      const slotTimeStr = minutesToTime(currentMin);
      const slotEndMin = currentMin + (serviceDuration || 30);

      let isInterval = false;
      if (hasInt) {
        if (intStartMin < intEndMin) {
          isInterval = currentMin < intEndMin && slotEndMin > intStartMin;
        } else {
          isInterval = currentMin >= intStartMin || slotEndMin <= intEndMin;
        }
      }

      const isTooSoon = date === todayStr && currentMin < nowMin;

      if (!isInterval && !isTooSoon) {
        slots.push(slotTimeStr);
      }
    }
    return slots;
  };

  const getAvailableSlots = (date: string, service: Service | null) => {
    if (!bookingBarber?.businessHours) return [];
    const dayOfWeek = new Date(date + "T12:00:00").getDay();
    if (!bookingBarber.businessHours.days.includes(dayOfWeek)) return [];

    if (bookingBarber.unavailableSlots?.some((u: any) => u.date === date && !u.time)) return [];

    const duration = service?.duration || 30;

    const allSlots = generateTimeSlots(
      date,
      bookingBarber.businessHours.open,
      bookingBarber.businessHours.close,
      bookingBarber.businessHours.intervalStart,
      bookingBarber.businessHours.intervalEnd,
      duration,
    );

    return allSlots.filter((time) => {
      const isBlockedSlot = bookingBarber.unavailableSlots?.some(
        (u: any) => u.date === date && u.time === time,
      );
      if (isBlockedSlot) return false;

      const isAptCollision = appointments.some((a) => {
        if (a.date !== date || a.status === AppointmentStatus.Rejected) return false;
        const existingService = bookingServices.find((s) => s.id === a.serviceId);
        const aDuration = existingService?.duration || 30;
        const aStart = timeToMinutes(a.time);
        const aEnd = aStart + aDuration;
        const slotStart = timeToMinutes(time);
        const slotEnd = slotStart + duration;
        return slotStart < aEnd && aStart < slotEnd;
      });

      const isReqCollision = appointmentRequests.some((r) => {
        if (r.date !== date || r.status !== "pending") return false;
        const requestedService = bookingServices.find((s) => s.id === r.serviceId);
        const rDuration = requestedService?.duration || 30;
        const rStart = timeToMinutes(r.time);
        const rEnd = rStart + rDuration;
        const slotStart = timeToMinutes(time);
        const slotEnd = slotStart + duration;
        return slotStart < rEnd && rStart < slotEnd;
      });

      return !isAptCollision && !isReqCollision;
    });
  };

  const handleSubmitRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const currentName = clientSession ? clientSession.name : name.trim();
    const currentPhone = clientSession ? clientSession.phone.replace(/\D/g, "") : phone.replace(/\D/g, "");

    if (!selectedService || !barberIdFromUrl || !bookingDate || !bookingTime) {
      showToast("Por favor, selecione serviço, data e horário.", "error");
      return;
    }

    if (!currentName || !currentPhone) {
      showToast("Por favor, informe seu nome e WhatsApp para agendar.", "error");
      if (!clientSession) setStep(3);
      return;
    }

    setIsSubmitting(true);

    const updatedAvailableSlots = getAvailableSlots(bookingDate, selectedService);
    if (!updatedAvailableSlots.includes(bookingTime)) {
      showToast("Esse horário acaba de ser reservado. Escolha outro!", "error");
      setIsSubmitting(false);
      setBookingTime("");
      setStep(2);
      return;
    }

    const requestId = Date.now().toString();
    try {
      await setDoc(doc(db, "users", barberIdFromUrl, "requests", requestId), {
        id: requestId,
        serviceId: selectedService.id,
        date: bookingDate,
        time: bookingTime,
        clientName: currentName,
        clientPhone: currentPhone,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem("bk_client_name", currentName);
      localStorage.setItem("bk_client_phone", currentPhone);
      setClientSession({ name: currentName, phone: currentPhone });

      setBookingSuccess(true);
    } catch (err) {
      console.error("Booking error:", err);
      showToast("Erro ao enviar agendamento. Tente novamente.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-3 sm:p-4 text-slate-100">
        <div className="max-w-sm w-full bg-slate-900/90 border border-white/10 rounded-3xl p-6 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 size={36} className="animate-bounce" />
          </div>
          
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
              Solicitação Enviada!
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              O barbeiro recebeu seu pedido para <strong className="text-white">{selectedService?.name}</strong> no dia <strong className="text-[#E1B15F]">{bookingDate.split("-").reverse().join("/")} às {bookingTime}</strong>.
            </p>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-300 font-bold leading-snug">
            Status: <span className="uppercase font-black text-amber-400">Pendente de Confirmação</span>
            <br />
            Você será notificado pelo WhatsApp.
          </div>

          <div className="space-y-2 pt-2">
            <Button
              className="w-full h-11 text-xs font-black uppercase tracking-wider"
              onClick={() => {
                setBookingSuccess(false);
                setBookingDate("");
                setBookingTime("");
                setSelectedService(null);
                setStep(1);
              }}
            >
              NOVO AGENDAMENTO
            </Button>
            
            <button
              onClick={() => {
                setBookingSuccess(false);
                setViewMode("my-bookings");
              }}
              className="w-full py-2.5 text-[10px] font-black text-[#E1B15F] hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
            >
              ACOMPANHAR MEUS PEDIDOS
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (bookingError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-3 sm:p-4 text-slate-100">
        <div className="max-w-sm w-full bg-slate-900/90 border border-red-500/30 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
          <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500">
            <AlertTriangle size={36} />
          </div>
          <h2 className="text-lg font-black text-white italic uppercase">
            {bookingError}
          </h2>
          <Button
            className="w-full h-11"
            onClick={() => window.location.reload()}
          >
            TENTAR NOVAMENTE
          </Button>
        </div>
      </div>
    );
  }

  if (!bookingBarber) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <LogoElite className="h-16 w-16" />
          <p className="text-elite-cyan-400 font-black tracking-widest text-[9px] uppercase">
            Carregando Barbearia...
          </p>
        </div>
      </div>
    );
  }

  const availableSlots = getAvailableSlots(bookingDate, selectedService);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-2.5 sm:p-4 pb-20">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 shadow-2xl max-w-[90vw] text-center ${
            toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-500 text-slate-950"
          }`}
        >
          {toast.type === "error" ? <AlertTriangle size={14} className="shrink-0" /> : <CheckCircle2 size={14} className="shrink-0" />}
          <span className="truncate">{toast.message}</span>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-3 animate-in fade-in duration-500">
        
        {/* Compact Header Bar */}
        <div className="flex items-center justify-between bg-slate-900/60 border border-white/5 px-3.5 py-3 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
              {bookingBarber.profileImage ? (
                <img src={bookingBarber.profileImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <Scissors size={16} className="text-[#E1B15F]" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-white uppercase italic tracking-tight truncate leading-tight">
                {bookingBarber.shopName || "Barbearia"}
              </h1>
              <p className="text-[8px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Agendamento Rápido
              </p>
            </div>
          </div>

          <button
            onClick={() => setViewMode(viewMode === "booking" ? "my-bookings" : "booking")}
            className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-white/10 rounded-xl text-[8px] font-black uppercase tracking-wider text-[#E1B15F] hover:text-white transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <History size={12} />
            {viewMode === "booking" ? "Meus Cortes" : "Voltar"}
          </button>
        </div>

        {/* Persistent Client Credentials Card - Ultra-compact 1-liner */}
        {clientSession && viewMode === "booking" && (
          <div className="flex items-center justify-between px-3 py-2 bg-[#E1B15F]/5 border border-[#E1B15F]/20 rounded-xl text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded-full bg-[#E1B15F]/20 text-[#E1B15F] font-black text-[10px] flex items-center justify-center shrink-0">
                {clientSession.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-[10px] font-bold text-white truncate">
                <span className="text-[#E1B15F] font-black">Cliente:</span> {clientSession.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("bk_client_name");
                localStorage.removeItem("bk_client_phone");
                setClientSession(null);
                setName("");
                setPhone("");
                showToast("Identificação limpa.", "info");
              }}
              className="text-[8px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 ml-2 shrink-0 cursor-pointer"
            >
              Trocar
            </button>
          </div>
        )}

        {viewMode === "my-bookings" ? (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-white uppercase italic">
                <Search size={14} className="text-[#E1B15F]" />
                Consultar Meus Cortes
              </div>
              <div className="flex gap-1.5">
                <Input
                  placeholder="Seu WhatsApp (apenas números)"
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  className="h-10 text-xs"
                />
                <Button onClick={fetchMyBookings} className="h-10 px-4 text-[9px] font-black uppercase tracking-wider">
                  BUSCAR
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {myRequests.map((r) => {
                const service = bookingServices.find((s) => s.id === r.serviceId);
                const isAccepted = r.status === "accepted";
                const isPending = r.status === "pending";

                return (
                  <div
                    key={r.id}
                    className="p-3 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[9px] text-[#E1B15F] font-black uppercase tracking-wider">
                          {r.date.split("-").reverse().join("/")} • {r.time}
                        </p>
                        <p className="text-white font-black italic uppercase text-xs">
                          {service?.name || "Serviço"}
                        </p>
                      </div>
                      <Badge
                        variant={isAccepted ? "success" : isPending ? "amber" : "danger"}
                        className="text-[8px] uppercase tracking-wider px-2 py-0.5 font-black shrink-0"
                      >
                        {isAccepted ? "CONFIRMADO" : isPending ? "PENDENTE" : "RECUSADO"}
                      </Badge>
                    </div>
                    {r.status === "rejected" && r.rejectReason && (
                      <p className="text-[10px] text-red-300 font-medium bg-red-500/10 p-2 rounded-xl border border-red-500/20">
                        {r.rejectReason}
                      </p>
                    )}
                  </div>
                );
              })}

              {myRequests.length === 0 && phoneFilter && (
                <div className="text-center py-8 text-slate-500 bg-slate-900/20 rounded-2xl border border-dashed border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Nenhum agendamento encontrado
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Compact 3-Step Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-900/70 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`py-1.5 text-center rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  step === 1
                    ? "bg-[#E1B15F] text-slate-950 shadow-sm"
                    : selectedService
                    ? "text-slate-300 hover:text-white"
                    : "text-slate-600"
                }`}
              >
                1. Serviço
              </button>
              <button
                type="button"
                disabled={!selectedService}
                onClick={() => selectedService && setStep(2)}
                className={`py-1.5 text-center rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  step === 2
                    ? "bg-[#E1B15F] text-slate-950 shadow-sm"
                    : bookingDate && bookingTime
                    ? "text-slate-300 hover:text-white"
                    : "text-slate-600 disabled:opacity-40"
                }`}
              >
                2. Data & Hora
              </button>
              <button
                type="button"
                disabled={!selectedService || !bookingDate || !bookingTime}
                onClick={() => selectedService && bookingDate && bookingTime && setStep(3)}
                className={`py-1.5 text-center rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  step === 3
                    ? "bg-[#E1B15F] text-slate-950 shadow-sm"
                    : "text-slate-600 disabled:opacity-40"
                }`}
              >
                3. Confirmar
              </button>
            </div>

            {/* STEP 1: Escolha o Serviço */}
            {step === 1 && (
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3.5 space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-white italic uppercase flex items-center gap-1.5">
                    <Scissors size={14} className="text-elite-red-500" />
                    Selecione o Corte / Serviço
                  </h3>
                  <span className="text-[8px] font-bold text-slate-500 uppercase">
                    {bookingServices.length} disponíveis
                  </span>
                </div>

                <div className="space-y-2">
                  {bookingServices.length === 0 ? (
                    <div className="text-center py-6 text-slate-500">
                      <p className="text-[10px] uppercase font-bold tracking-wider">
                        Nenhum serviço disponível no momento.
                      </p>
                    </div>
                  ) : (
                    bookingServices.map((s) => {
                      const isSelected = selectedService?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedService(s);
                            setStep(2);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group cursor-pointer ${
                            isSelected
                              ? "border-[#E1B15F] bg-[#E1B15F]/15 shadow-md shadow-[#E1B15F]/10"
                              : "border-white/5 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-extrabold text-xs text-white uppercase italic truncate group-hover:text-[#E1B15F] transition-colors">
                              {s.name}
                            </p>
                            <p className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                              <Clock size={10} className="text-slate-500" /> {s.duration} min
                            </p>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <p className="font-black text-[#E1B15F] text-sm italic">
                              R$ {s.price.toFixed(2)}
                            </p>
                            <ChevronRight size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Data e Horário */}
            {step === 2 && (
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3.5 space-y-3.5 animate-in fade-in duration-300">
                {/* Service Chip Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Serviço:</span>
                    <span className="text-xs font-black text-white uppercase italic truncate">
                      {selectedService?.name} (R$ {selectedService?.price.toFixed(2)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[8px] font-black text-[#E1B15F] hover:text-white uppercase tracking-wider cursor-pointer shrink-0 ml-2"
                  >
                    Alterar
                  </button>
                </div>

                {/* Calendar Card */}
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3 space-y-2.5">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      disabled={isPrevDisabled}
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none rounded-lg cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <span className="text-xs font-black uppercase text-white tracking-wider italic">
                      {monthNames[currentMonth]} {currentYear}
                    </span>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Weekday Names */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
                      <span key={label} className="text-[8px] font-bold text-slate-500 uppercase">
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarCells.map((cell, index) => {
                      if (!cell.isCurrentMonth) {
                        return (
                          <div
                            key={`pad-${index}`}
                            className="aspect-square flex items-center justify-center text-[10px] font-bold text-slate-800"
                          >
                            {cell.day}
                          </div>
                        );
                      }

                      const isSelected = bookingDate === cell.dateStr;
                      const todayStr = new Date().toISOString().split("T")[0];
                      const isPast = cell.dateStr < todayStr;
                      const dateObj = new Date(cell.dateStr + "T12:00:00");
                      const dayOfWeek = dateObj.getDay();
                      const isBusinessDay = bookingBarber?.businessHours?.days?.includes(dayOfWeek);
                      const isBlocked = bookingBarber?.unavailableSlots?.some((u: any) => u.date === cell.dateStr && !u.time);

                      const isDisabled = isPast || !isBusinessDay || isBlocked;
                      const slots = isDisabled ? [] : getAvailableSlots(cell.dateStr, selectedService);
                      const hasSlots = slots.length > 0;

                      let btnStyle = "border border-white/5 bg-slate-900/60 text-slate-300 hover:border-slate-600";
                      if (isSelected) {
                        btnStyle = "bg-[#E1B15F] text-slate-950 font-black shadow-md shadow-[#E1B15F]/20 border-none scale-105";
                      } else if (isDisabled) {
                        btnStyle = "opacity-15 cursor-not-allowed bg-transparent text-slate-600 border-none pointer-events-none";
                      } else if (!hasSlots) {
                        btnStyle = "border border-red-500/10 bg-red-500/5 text-slate-500";
                      } else {
                        btnStyle = "border border-emerald-500/15 bg-emerald-500/5 text-emerald-400 hover:border-emerald-500/40";
                      }

                      return (
                        <button
                          key={`day-${cell.day}`}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            setBookingDate(cell.dateStr);
                            setBookingTime("");
                          }}
                          className={`aspect-square flex flex-col items-center justify-center rounded-lg p-0.5 transition-all relative cursor-pointer ${btnStyle}`}
                        >
                          <span className="text-xs font-black">{cell.day}</span>
                          {!isDisabled && (
                            <span className={`text-[6px] font-bold uppercase leading-none tracking-tighter ${
                              isSelected ? "text-slate-950" : hasSlots ? "text-emerald-400" : "text-red-400"
                            }`}>
                              {hasSlots ? `${slots.length}h` : "x"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Hours */}
                {bookingDate && (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black text-[#E1B15F] uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                        Horários: {bookingDate.split("-").reverse().join("/")}
                      </p>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">
                        {availableSlots.length} disponíveis
                      </span>
                    </div>

                    {availableSlots.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                        {availableSlots.map((time) => {
                          const isSlotSelected = bookingTime === time;
                          return (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setBookingTime(time)}
                              className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                                isSlotSelected
                                  ? "bg-[#E1B15F] text-slate-950 shadow-md shadow-[#E1B15F]/20 scale-105"
                                  : "bg-slate-950 text-white border border-white/5 hover:border-slate-700"
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-center">
                        <p className="text-[10px] text-red-400 font-black uppercase">
                          Sem horários vagos neste dia. Escolha outra data.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action CTA Button */}
                {bookingDate && bookingTime && (
                  <div className="pt-2">
                    {clientSession ? (
                      <Button
                        type="button"
                        onClick={() => handleSubmitRequest()}
                        disabled={isSubmitting}
                        className="w-full h-12 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 border-none text-white shadow-lg"
                      >
                        {isSubmitting ? "ENVIANDO..." : "CONFIRMAR AGENDAMENTO AGORA"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => setStep(3)}
                        className="w-full h-12 text-xs font-black uppercase tracking-wider"
                      >
                        AVANÇAR PARA IDENTIFICAÇÃO
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Identificação */}
            {step === 3 && (
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3.5 space-y-3.5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-white italic uppercase flex items-center gap-1.5">
                    <UserIcon size={14} className="text-elite-red-500" />
                    Identificação para Agendamento
                  </h3>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[8px] font-black text-slate-400 hover:text-white uppercase tracking-wider cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>

                {/* Compact Summary Strip */}
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-extrabold text-white uppercase italic truncate">
                      {selectedService?.name}
                    </p>
                    <p className="text-[10px] text-[#E1B15F] font-bold">
                      {bookingDate.split("-").reverse().join("/")} às {bookingTime}
                    </p>
                  </div>
                  <span className="font-black text-[#E1B15F] text-sm shrink-0">
                    R$ {selectedService?.price.toFixed(2)}
                  </span>
                </div>

                <form onSubmit={handleSubmitRequest} className="space-y-3">
                  <Input
                    label="SEU NOME COMPLETO"
                    placeholder="Ex: Matheus Farias"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-10 text-xs"
                  />
                  <Input
                    label="SEU WHATSAPP (COM DDD)"
                    placeholder="Ex: 85999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="h-10 text-xs"
                  />

                  <p className="text-[8px] text-slate-400 font-medium leading-tight">
                    Seus dados serão gravados com segurança para agendamentos rápidos em 1 clique nas próximas vezes.
                  </p>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !name.trim() || !phone.trim()}
                    className="w-full h-12 text-xs font-black uppercase tracking-wider shadow-xl"
                  >
                    {isSubmitting ? "ENVIANDO SOLICITAÇÃO..." : "FINALIZAR AGENDAMENTO"}
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 text-center">
          <WoodenMouseSignature />
        </div>
      </div>
    </div>
  );
};

export default App;
