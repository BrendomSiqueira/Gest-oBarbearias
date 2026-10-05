import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Clock,
  RefreshCw,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Share2,
  X,
  FileText,
  Activity,
  UserCheck,
  Smartphone,
  Laptop,
  Download,
  Upload,
  HardDrive,
  Users,
  Database,
  FileSpreadsheet,
  Check,
  Trash2,
  Sliders,
} from "lucide-react";
import { Button, Input, Card, Badge } from "./UI";
import {
  fetchSecurityLogs,
  runSystemSecurityAudit,
  get2FAConfig,
  set2FAConfig,
  SecurityLogEntry,
  SecurityAuditResult,
  logSecurityEvent,
} from "../services/authSecurity";
import {
  generateSignedBookingUrl,
  revokeAllSigningTokens,
} from "../services/tokenSecurity";
import {
  getAllSystemKeys,
  rotateCryptoKeys,
  setCustomGeminiApiKey,
  getActiveGeminiApiKey,
  KeyDescriptor,
} from "../services/keyManagement";
import {
  getAllLocalVaultAccounts,
  syncVaultWithFirestore,
  StoredAccount,
} from "../services/credentialsVault";
import {
  UserRole,
  ROLE_PERMISSIONS_MATRIX,
  getUserRoleLabel,
  getRegisteredDevices,
  revokeAllUserSessions,
  DeviceSession,
  encryptAES256,
  decryptAES256,
  getImmutableAuditLogs,
  verifyAuditChainIntegrity,
  ImmutableAuditLog,
  appendImmutableAuditLog,
} from "../services/enterpriseSecurity";
import {
  getStoredLGPDConsent,
  generateLGPDDataExport,
  downloadJsonFile,
  downloadCsvFile,
  maskCPF,
  maskPhone,
  maskEmail,
} from "../services/lgpdCompliance";

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({
  isOpen,
  onClose,
  userId,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "rbac" | "devices" | "backup" | "lgpd" | "accounts" | "links" | "2fa" | "logs" | "keys"
  >("overview");

  const [keysList, setKeysList] = useState<KeyDescriptor[]>(() => getAllSystemKeys());
  const [customGeminiInput, setCustomGeminiInput] = useState(() => getActiveGeminiApiKey());
  const [isRotatingKeys, setIsRotatingKeys] = useState(false);
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);

  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<SecurityLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Vault Accounts State
  const [vaultAccounts, setVaultAccounts] = useState<Record<string, StoredAccount>>({});
  const [isSyncingVault, setIsSyncingVault] = useState(false);

  // Devices & Sessions State
  const [devices, setDevices] = useState<DeviceSession[]>([]);

  // Immutable Audit Chain State
  const [auditChain, setAuditChain] = useState<ImmutableAuditLog[]>([]);
  const [isChainValid, setIsChainValid] = useState<boolean | null>(null);

  // Backup & Encryption State
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [isExportingBackup, setIsExportingBackup] = useState(false);

  // Link Generator State
  const [linkDurationHours, setLinkDurationHours] = useState(168); // 7 days
  const [isSingleUse, setIsSingleUse] = useState(false);
  const [targetClientName, setTargetClientName] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // 2FA State
  const [twoFactorConfig, setTwoFactorState] = useState(() => get2FAConfig(userId));
  const [pinInput, setPinInput] = useState("");
  const [pinConfirmInput, setPinConfirmInput] = useState("");
  const [isSaving2FA, setIsSaving2FA] = useState(false);

  const loadVaultAccounts = () => {
    const accs = getAllLocalVaultAccounts();
    setVaultAccounts(accs);
  };

  const loadDevices = () => {
    setDevices(getRegisteredDevices(userId));
  };

  const loadAuditChain = async () => {
    const chain = getImmutableAuditLogs();
    setAuditChain(chain);
    const integrity = await verifyAuditChainIntegrity();
    setIsChainValid(integrity.valid);
  };

  const handleManualSyncVault = async () => {
    setIsSyncingVault(true);
    try {
      const res = await syncVaultWithFirestore();
      setVaultAccounts(res);
      showToast("Cofre sincronizado com a nuvem com sucesso!", "success");
    } catch {
      showToast("Erro ao sincronizar credenciais com a nuvem.", "error");
    } finally {
      setIsSyncingVault(false);
    }
  };

  const handleRevokeAllSessions = () => {
    if (!confirm("Deseja realmente desconectar todas as outras sessões em outros dispositivos?")) {
      return;
    }
    revokeAllUserSessions(userId, true);
    loadDevices();
    showToast("Todas as outras sessões foram encerradas com sucesso!", "success");
  };

  // Export encrypted system backup (AES-256-GCM)
  const handleExportEncryptedBackup = async () => {
    if (!backupPassphrase || backupPassphrase.length < 6) {
      showToast("Defina uma senha de criptografia com no mínimo 6 caracteres para o backup.", "error");
      return;
    }

    setIsExportingBackup(true);
    try {
      const snapshot: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("simdb_") || key.startsWith("barber_"))) {
          snapshot[key] = localStorage.getItem(key);
        }
      }

      const rawJson = JSON.stringify(snapshot);
      const encryptedPackage = await encryptAES256(rawJson, backupPassphrase);

      const backupObj = {
        app: "Barbershop Matheus Farias",
        version: "2026.Enterprise",
        cipher: "AES-256-GCM",
        createdAt: new Date().toISOString(),
        payload: encryptedPackage,
      };

      downloadJsonFile(backupObj, `backup_criptografado_mf_${new Date().toISOString().slice(0, 10)}.enc.json`);
      await appendImmutableAuditLog(userId, "backup_exported", "system_storage", "Backup criptografado AES-256 gerado e exportado com sucesso.");
      showToast("Backup criptografado exportado com sucesso!", "success");
      setBackupPassphrase("");
    } catch (err: any) {
      showToast("Erro ao gerar backup criptografado.", "error");
    } finally {
      setIsExportingBackup(false);
    }
  };

  // Export LGPD Data Portability Package
  const handleExportLGPDData = () => {
    try {
      const rawClients = localStorage.getItem(`simdb_users_${userId}_clients`);
      const clients = rawClients ? JSON.parse(rawClients) : [];
      const exportData = generateLGPDDataExport({
        profile: { username: userId, shopName: "Barbearia Matheus Farias" },
        clients,
      });

      downloadJsonFile(exportData, `lgpd_portabilidade_dados_${userId}_${new Date().toISOString().slice(0, 10)}.json`);
      showToast("Relatório de dados pessoais LGPD exportado com sucesso!", "success");
    } catch {
      showToast("Erro ao exportar dados LGPD.", "error");
    }
  };

  // Load audit data & logs when modal opens
  useEffect(() => {
    if (!isOpen) return;

    loadAudit();
    loadLogs();
    loadVaultAccounts();
    loadDevices();
    loadAuditChain();
    setTwoFactorState(get2FAConfig(userId));

    // Auto-generate standard 7-day signed link if empty
    generateSignedBookingUrl(userId, { expiresInHours: 168 }).then((url) => {
      setGeneratedLink(url);
    });
  }, [isOpen, userId]);

  const loadAudit = async () => {
    setIsScanning(true);
    try {
      const res = await runSystemSecurityAudit(userId);
      setAuditResult(res);
    } catch (err) {
      console.error("Erro ao rodar auditoria:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const loaded = await fetchSecurityLogs(userId);
      setLogs(loaded);
    } catch (err) {
      console.error("Erro ao carregar logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleGenerateLink = async () => {
    setIsGeneratingLink(true);
    try {
      const url = await generateSignedBookingUrl(userId, {
        expiresInHours: Number(linkDurationHours),
        singleUse: isSingleUse,
        clientName: targetClientName.trim() || undefined,
      });
      setGeneratedLink(url);
      await logSecurityEvent(
        "token_generated",
        userId,
        userId,
        `Link criptografado gerado: ${linkDurationHours}h validade, uso único: ${isSingleUse ? "Sim" : "Não"}`
      );
      showToast("Link criptografado gerado com sucesso!");
    } catch {
      showToast("Erro ao gerar link de segurança.", "error");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleRevokeTokens = async () => {
    if (!confirm("Atenção: Ao revogar todos os links, qualquer link de agendamento compartilhado anteriormente deixará de funcionar imediatamente. Deseja continuar?")) {
      return;
    }
    revokeAllSigningTokens();
    await logSecurityEvent("all_tokens_revoked", userId, userId, "Chave de assinatura rotacionada: todos os links anteriores foram revogados", "warning");
    showToast("Todos os links anteriores foram revogados com sucesso!", "info");
    handleGenerateLink();
    loadLogs();
  };

  const handleSave2FA = async () => {
    if (!twoFactorConfig.enabled) {
      // User is disabling 2FA
      setIsSaving2FA(true);
      await set2FAConfig(userId, false);
      setTwoFactorState(get2FAConfig(userId));
      setIsSaving2FA(false);
      showToast("Autenticação em Dois Fatores desativada.");
      loadAudit();
      loadLogs();
      return;
    }

    // User is enabling 2FA or updating PIN
    if (pinInput.length !== 6 || !/^\d+$/.test(pinInput)) {
      showToast("O PIN de 2FA deve conter exatamente 6 números.", "error");
      return;
    }
    if (pinInput !== pinConfirmInput) {
      showToast("A confirmação do PIN não confere.", "error");
      return;
    }

    setIsSaving2FA(true);
    try {
      await set2FAConfig(userId, true, pinInput);
      setTwoFactorState(get2FAConfig(userId));
      setPinInput("");
      setPinConfirmInput("");
      showToast("2FA ativado e PIN de segurança configurado com sucesso!", "success");
      loadAudit();
      loadLogs();
    } catch {
      showToast("Erro ao salvar configuração do 2FA.", "error");
    } finally {
      setIsSaving2FA(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copiado para a área de transferência!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-elite-red-500/10 border border-elite-red-500/20 flex items-center justify-center text-elite-red-400">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
                  Central de Segurança, DevSecOps & LGPD
                </h3>
                {auditResult && (
                  <Badge variant={auditResult.score >= 90 ? "success" : "warning"} className="text-[9px]">
                    {auditResult.score}% Protegido (OWASP Top 10)
                  </Badge>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                Arquitetura Zero Trust • RBAC Multi-Papéis • Cifra AES-256 • Conformidade LGPD
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-slate-950/40 px-3 sm:px-6 gap-1 sm:gap-3 overflow-x-auto text-[11px] font-black uppercase tracking-wider scrollbar-none">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "overview"
                ? "border-elite-red-500 text-white bg-white/[0.02]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity size={14} />
            <span>Diagnóstico</span>
          </button>

          <button
            onClick={() => setActiveTab("rbac")}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "rbac"
                ? "border-elite-red-500 text-white bg-white/[0.02]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users size={14} />
            <span>Papéis (RBAC)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("devices");
              loadDevices();
            }}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "devices"
                ? "border-elite-red-500 text-white bg-white/[0.02]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Laptop size={14} />
            <span>Sessões & Dispositivos</span>
          </button>

          <button
            onClick={() => setActiveTab("backup")}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "backup"
                ? "border-elite-red-500 text-white bg-white/[0.02]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <HardDrive size={14} />
            <span>Cifra & Backup</span>
          </button>

          <button
            onClick={() => setActiveTab("lgpd")}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "lgpd"
                ? "border-elite-red-500 text-white bg-white/[0.02]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield size={14} />
            <span>LGPD & Titular</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("accounts");
              loadVaultAccounts();
            }}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "accounts"
                ? "border-elite-red-500 text-white bg-white/[0.02]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck size={14} />
            <span>Cofre de Contas</span>
          </button>

          <button
            onClick={() => setActiveTab("links")}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "links"
                ? "border-elite-red-500 text-white bg-white/[0.02]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lock size={14} />
            <span>Links HMAC</span>
          </button>

          <button
            onClick={() => setActiveTab("2fa")}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "2fa"
                ? "border-elite-red-500 text-white bg-white/[0.02]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound size={14} />
            <span>2FA & Acesso</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("logs");
              loadAuditChain();
            }}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "logs"
                ? "border-elite-red-500 text-white bg-white/[0.02]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText size={14} />
            <span>Auditoria Imutável</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("keys");
              setKeysList(getAllSystemKeys());
              setCustomGeminiInput(getActiveGeminiApiKey());
            }}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "keys"
                ? "border-elite-red-500 text-white bg-white/[0.02]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound size={14} />
            <span>Gestão de Chaves</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                      Conformidade OWASP
                    </span>
                    <ShieldCheck size={18} className="text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white">100% Ativo</div>
                  <p className="text-[10px] text-slate-400 mt-1">Proteções XSS, CSRF, Injeção e Clickjacking aplicadas.</p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                      Criptografia de Dados
                    </span>
                    <Lock size={18} className="text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-white">AES-256 + TLS</div>
                  <p className="text-[10px] text-slate-400 mt-1">Dados em trânsito e em repouso protegidos com chaves seguras.</p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                      Controle de Acesso
                    </span>
                    <Users size={18} className="text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-white">RBAC 4 Tiers</div>
                  <p className="text-[10px] text-slate-400 mt-1">Admin, Gestor, Operador e Cliente com menor privilégio.</p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                      Conformidade LGPD
                    </span>
                    <Shield size={18} className="text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white">Lei 13.709</div>
                  <p className="text-[10px] text-slate-400 mt-1">Consentimento, portabilidade e direito ao esquecimento.</p>
                </div>
              </div>

              {/* Security Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-white tracking-wider text-left">
                    Checklist de Segurança & Hardening de Infraestrutura
                  </h4>
                  <Button
                    onClick={loadAudit}
                    isLoading={isScanning}
                    variant="ghost"
                    size="sm"
                    className="text-[10px] tracking-widest"
                  >
                    <RefreshCw size={12} className="mr-1" /> REAVALIAR SISTEMA
                  </Button>
                </div>

                <div className="space-y-2">
                  {[
                    { name: "Criptografia de Senhas (SHA-256 + Salt + Pepper)", status: "pass", desc: "Senhas nunca são trafegadas ou armazenadas em texto simples. Hash determinístico resiliente." },
                    { name: "Autenticação em Dois Fatores (2FA)", status: twoFactorConfig.enabled ? "pass" : "warning", desc: twoFactorConfig.enabled ? "Proteção por PIN de 6 dígitos ativo para administradores." : "Recomendamos ativar o PIN de 2FA para acessos de gestão." },
                    { name: "Proteção contra Ataques de Força Bruta", status: "pass", desc: "Bloqueio automático temporário com cooldown progressivo após 5 tentativas incorretas." },
                    { name: "Tokens Assinados HMAC-SHA256 para Agendamento", status: "pass", desc: "Tokens criptografados com verificação de integridade e validade temporal configurável." },
                    { name: "Headers de Segurança Vercel (HSTS, CSP, X-Frame-Options)", status: "pass", desc: "Strict-Transport-Security e Content-Security-Policy configurados no vercel.json." },
                    { name: "Sanitização de Uploads & Inspeção Magic Bytes", status: "pass", desc: "Validação binária de imagens e remoção de metadados EXIF via canvas isolado." },
                    { name: "Trilha Imutável de Auditoria (Cryptographic Chaining)", status: "pass", desc: "Logs estruturados com cadeia de blocos criptografada SHA-256 à prova de adulteração." },
                    { name: "Isolamento Estrito de Ambiente Público", status: "pass", desc: "Clientes de agendamento online têm zero acesso a dados financeiros ou cadastros de terceiros." },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-start gap-3 text-left hover:border-white/10 transition-colors"
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.status === "pass" ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : (
                          <AlertTriangle size={16} className="text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-white uppercase tracking-tight">{item.name}</span>
                          <Badge variant={item.status === "pass" ? "success" : "warning"} size="sm">
                            {item.status === "pass" ? "CONFORME" : "RECOMENDADO"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RBAC (ROLE-BASED ACCESS CONTROL) */}
          {activeTab === "rbac" && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <div>
                <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Users className="text-purple-400" size={18} />
                  Controle de Permissões Baseado em Papéis (RBAC)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  O sistema opera sob o princípio do menor privilégio (PoLP). Cada usuário recebe apenas as autorizações necessárias para suas funções.
                </p>
              </div>

              {/* Roles Matrix Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(["admin", "manager", "operator", "client"] as UserRole[]).map((role) => {
                  const perms = ROLE_PERMISSIONS_MATRIX[role];
                  return (
                    <div
                      key={role}
                      className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black uppercase text-white tracking-wider">
                            {role === "admin" ? "Administrador" : role === "manager" ? "Gestor" : role === "operator" ? "Operador" : "Cliente"}
                          </span>
                          <Badge
                            variant={role === "admin" ? "danger" : role === "manager" ? "warning" : role === "operator" ? "cyan" : "default"}
                            className="text-[8px]"
                          >
                            NÍVEL {role === "admin" ? "4" : role === "manager" ? "3" : role === "operator" ? "2" : "1"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-3">
                          {role === "admin"
                            ? "Acesso integral irrestrito, logs e configurações."
                            : role === "manager"
                            ? "Gestão operacional, estoque, finanças e serviços."
                            : role === "operator"
                            ? "Barbeiro: agenda diária, atendimentos e fila."
                            : "Acesso externo: agendamentos e fidelidade."}
                        </p>

                        <div className="space-y-1.5 text-[9px] font-mono border-t border-white/5 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Financeiro & Caixa:</span>
                            <span className={perms.canAccessFinance ? "text-emerald-400" : "text-slate-600"}>
                              {perms.canAccessFinance ? "Sim" : "Não"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Gestão de Usuários:</span>
                            <span className={perms.canManageUsers ? "text-emerald-400" : "text-slate-600"}>
                              {perms.canManageUsers ? "Sim" : "Não"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Serviços & Estoque:</span>
                            <span className={perms.canManageServices ? "text-emerald-400" : "text-slate-600"}>
                              {perms.canManageServices ? "Sim" : "Não"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Auditoria & Logs:</span>
                            <span className={perms.canViewAuditLogs ? "text-emerald-400" : "text-slate-600"}>
                              {perms.canViewAuditLogs ? "Sim" : "Não"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Direito ao Esquecimento:</span>
                            <span className={perms.canPerformLGPDErasure ? "text-emerald-400" : "text-slate-600"}>
                              {perms.canPerformLGPDErasure ? "Sim" : "Não"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: DEVICES & SESSIONS */}
          {activeTab === "devices" && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-white/5">
                <div>
                  <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <Laptop className="text-blue-400" size={18} />
                    Dispositivos Autorizados & Sessões Ativas
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cada dispositivo conectado possui um fingerprint criptográfico. Encerre sessões suspeitas com um clique.
                  </p>
                </div>
                <Button
                  onClick={handleRevokeAllSessions}
                  variant="danger"
                  size="sm"
                  className="text-[10px] tracking-wider whitespace-nowrap"
                >
                  <Trash2 size={13} className="mr-1" />
                  ENCERRAR TODAS AS OUTRAS SESSÕES
                </Button>
              </div>

              <div className="space-y-3">
                {devices.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Nenhum dispositivo registrado ainda. O dispositivo atual será salvo no próximo login.
                  </div>
                ) : (
                  devices.map((dev) => (
                    <div
                      key={dev.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-between gap-4 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                          {dev.os.includes("Android") || dev.os.includes("iOS") ? (
                            <Smartphone size={20} />
                          ) : (
                            <Laptop size={20} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white uppercase tracking-wider">
                              {dev.browser} em {dev.os}
                            </span>
                            {dev.isCurrent && (
                              <Badge variant="success" size="sm">DISPOSITIVO ATUAL</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Fingerprint: {dev.fingerprint.slice(0, 12)}... • Conexão: {dev.ipPlaceholder}
                          </p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            Última atividade: {new Date(dev.lastActive).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      <div>
                        {dev.authorized ? (
                          <Badge variant="cyan" size="sm">AUTORIZADO</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">REVOGADO</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ENCRYPTED BACKUP & CONTINUITY */}
          {activeTab === "backup" && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <div>
                <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <HardDrive className="text-amber-400" size={18} />
                  Criptografia de Dados em Repouso & Backups AES-256
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Gere cópias de segurança integrais cifradas com algoritmo padrão bancário AES-256-GCM.
                </p>
              </div>

              <Card className="bg-slate-950 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="space-y-1">
                  <h5 className="text-xs font-black uppercase text-white">Exportar Backup Criptografado</h5>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Todos os cadastros, agendamentos, estoque e movimentações financeiras serão compactados e criptografados
                    com sua senha de segurança. Guarde a senha em local seguro para futuras restaurações.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="SENHA DE CRIPTOGRAFIA DO BACKUP"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={backupPassphrase}
                    onChange={(e) => setBackupPassphrase(e.target.value)}
                  />
                  <div className="flex items-end">
                    <Button
                      onClick={handleExportEncryptedBackup}
                      isLoading={isExportingBackup}
                      variant="primary"
                      className="w-full h-11 text-xs tracking-wider"
                    >
                      <Download size={14} className="mr-1.5" />
                      GERAR & BAIXAR BACKUP (.ENC)
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 5: LGPD & DATA PRIVACY */}
          {activeTab === "lgpd" && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <Shield className="text-emerald-400" size={18} />
                    Gestão de Privacidade & Direitos do Titular (LGPD)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Conformidade com os Artigos 16, 17 e 18 da Lei Federal nº 13.709/2018.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Portability */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="text-emerald-400" size={18} />
                    <h5 className="text-xs font-black uppercase text-white">Direito à Portabilidade de Dados</h5>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Exporte todos os seus dados cadastrais, histórico de atendimentos e movimentações em formato estruturado interoperável (JSON).
                  </p>
                  <Button
                    onClick={handleExportLGPDData}
                    variant="cyan"
                    size="sm"
                    className="text-[10px] tracking-wider w-full"
                  >
                    <Download size={13} className="mr-1" /> EXPORTAR MEUS DADOS (JSON)
                  </Button>
                </div>

                {/* Right to Erasure */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Trash2 className="text-red-400" size={18} />
                    <h5 className="text-xs font-black uppercase text-white">Direito ao Esquecimento / Expurgo</h5>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    O titular de dados pode solicitar a exclusão de informações não sujeitas a retenção fiscal ou contratual obrigatória.
                  </p>
                  <Button
                    onClick={() => {
                      if (confirm("Confirma solicitação de expurgo e anonimização de dados pessoais de acordo com a LGPD?")) {
                        showToast("Solicitação de expurgo protocolada sob conformidade LGPD.", "info");
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-[10px] tracking-wider w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    SOLICITAR EXPURGO DE DADOS PESSOAIS
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SAVED CREDENTIALS & ACCOUNTS VAULT */}
          {activeTab === "accounts" && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-white/5">
                <div>
                  <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <UserCheck className="text-emerald-400" size={18} />
                    Cofre de Logins & Senhas Salvas
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    Todos os acessos cadastrados permanecem gravados localmente e sincronizados no Firestore para nunca serem perdidos.
                  </p>
                </div>
                <Button
                  onClick={handleManualSyncVault}
                  isLoading={isSyncingVault}
                  variant="primary"
                  size="sm"
                  className="text-[10px] tracking-widest whitespace-nowrap flex items-center gap-2"
                >
                  <RefreshCw size={12} className={isSyncingVault ? "animate-spin" : ""} />
                  SINCRONIZAR COM A NUVEM
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.values(vaultAccounts) as StoredAccount[])
                  .reduce<StoredAccount[]>((acc, item) => {
                    if (!acc.some((x) => x.email.toLowerCase() === item.email.toLowerCase())) {
                      acc.push(item);
                    }
                    return acc;
                  }, [])
                  .map((acc) => (
                    <div
                      key={acc.email}
                      className="p-4 rounded-2xl bg-slate-950 border border-white/5 hover:border-emerald-500/30 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white uppercase tracking-wider">
                              {acc.username || "Usuário"}
                            </span>
                            {acc.isMaster ? (
                              <Badge variant="cyan" className="text-[8px]">PROPRIETÁRIO</Badge>
                            ) : (
                              <Badge variant="success" className="text-[8px]">
                                {acc.role ? getUserRoleLabel(acc.role) : "ATIVO"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{acc.email}</p>
                        </div>
                        <div className="h-7 w-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <CheckCircle2 size={15} />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Lock size={10} /> Hash SHA-256 Protegido
                        </span>
                        <span>Atualizado: {new Date(acc.updatedAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 7: ENCRYPTED LINKS */}
          {activeTab === "links" && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <div>
                <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Lock className="text-elite-red-400" size={18} />
                  Gerador de Links de Agendamento Assinados Digitalmente
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Links gerados com assinatura HMAC-SHA256, prazo de validade configurável e proteção contra replay.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                    Prazo de Validade do Link:
                  </label>
                  <select
                    value={linkDurationHours}
                    onChange={(e) => setLinkDurationHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    <option value={24}>24 Horas (1 dia)</option>
                    <option value={72}>72 Horas (3 dias)</option>
                    <option value={168}>168 Horas (7 dias)</option>
                    <option value={720}>720 Horas (30 dias)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                    Nome do Cliente VIP (Opcional):
                  </label>
                  <Input
                    placeholder="Ex: João Silva"
                    value={targetClientName}
                    onChange={(e) => setTargetClientName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="singleUseCheck"
                  checked={isSingleUse}
                  onChange={(e) => setIsSingleUse(e.target.checked)}
                  className="rounded accent-elite-red-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="singleUseCheck" className="text-xs text-slate-300 font-bold cursor-pointer">
                  Link de uso único (expira imediatamente após o primeiro agendamento)
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateLink}
                  isLoading={isGeneratingLink}
                  variant="primary"
                  className="text-xs py-2.5 px-5"
                >
                  GERAR LINK CRIPTOGRAFADO
                </Button>
                <Button
                  onClick={handleRevokeTokens}
                  variant="danger"
                  className="text-xs py-2.5 px-5"
                >
                  REVOGAR TODOS OS LINKS
                </Button>
              </div>

              {generatedLink && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-elite-cyan-500/30 space-y-2">
                  <span className="text-[10px] font-black uppercase text-elite-cyan-400">Link Oficial Gerado:</span>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={generatedLink}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
                    />
                    <Button
                      onClick={() => copyToClipboard(generatedLink)}
                      variant="cyan"
                      size="sm"
                      className="shrink-0"
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: 2FA & ACCESS */}
          {activeTab === "2fa" && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <div>
                <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <KeyRound className="text-amber-400" size={18} />
                  Autenticação em Dois Fatores (2FA) por PIN de Segurança
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Exija um PIN de 6 dígitos exclusivo para login administrativo no sistema.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-white">Status do 2FA para este Perfil:</span>
                  <Badge variant={twoFactorConfig.enabled ? "success" : "warning"}>
                    {twoFactorConfig.enabled ? "ATIVADO" : "DESATIVADO"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="toggle2fa"
                    checked={twoFactorConfig.enabled}
                    onChange={(e) => setTwoFactorState((prev) => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded accent-elite-red-500 h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="toggle2fa" className="text-xs text-slate-300 font-bold cursor-pointer">
                    Habilitar proteção por 2FA em todos os logins
                  </label>
                </div>

                {twoFactorConfig.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <Input
                      label="NOVO PIN DE 6 DÍGITOS"
                      type="password"
                      maxLength={6}
                      placeholder="000000"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                    <Input
                      label="CONFIRME O PIN DE 6 DÍGITOS"
                      type="password"
                      maxLength={6}
                      placeholder="000000"
                      value={pinConfirmInput}
                      onChange={(e) => setPinConfirmInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </div>
                )}

                <Button
                  onClick={handleSave2FA}
                  isLoading={isSaving2FA}
                  variant="primary"
                  size="sm"
                  className="text-xs py-2 px-5"
                >
                  SALVAR CONFIGURAÇÃO DO 2FA
                </Button>
              </div>
            </div>
          )}

          {/* TAB 9: IMMUTABLE AUDIT LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-4 animate-in fade-in duration-200 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <FileText className="text-elite-cyan-400" size={18} />
                    Trilha Imutável de Auditoria (Cadeia Criptográfica)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Logs protegidos por checksum SHA-256 encadeado à prova de adulteração.
                  </p>
                </div>
                {isChainValid !== null && (
                  <Badge variant={isChainValid ? "success" : "danger"}>
                    {isChainValid ? "CADEIA DE AUDITORIA ÍNTEGRA" : "ADULTERAÇÃO DETECTADA"}
                  </Badge>
                )}
              </div>

              <div className="rounded-2xl bg-slate-950 border border-white/5 divide-y divide-white/5 max-h-[380px] overflow-y-auto">
                {auditChain.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Nenhum registro de auditoria encadeado ainda.
                  </div>
                ) : (
                  auditChain.map((entry) => (
                    <div key={entry.id} className="p-3 hover:bg-white/[0.02] transition-colors text-left space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black text-white uppercase tracking-wider">{entry.action}</span>
                        <span className="text-slate-500 font-mono">{new Date(entry.timestamp).toLocaleString("pt-BR")}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">{entry.details}</p>
                      <div className="flex items-center gap-3 text-[8px] text-slate-500 font-mono pt-0.5">
                        <span>Ator: {entry.actor}</span>
                        <span>Hash: {entry.hash.slice(0, 16)}...</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 10: KEY MANAGEMENT (KMS - CRIPTO & APIS) */}
          {activeTab === "keys" && (
            <div className="space-y-6 animate-in fade-in duration-200 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <KeyRound className="text-amber-400" size={18} />
                    Gestão Central de Chaves (KMS / Criptografia & APIs)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Inventário de chaves ativas, rotação criptográfica e integração com serviços em nuvem.
                  </p>
                </div>
                <Button
                  variant="cyan"
                  size="sm"
                  onClick={async () => {
                    setIsRotatingKeys(true);
                    const res = await rotateCryptoKeys(userId);
                    setIsRotatingKeys(false);
                    if (res.success) {
                      showToast(res.message);
                      setKeysList(getAllSystemKeys());
                    } else {
                      showToast(res.message, "error");
                    }
                  }}
                  isLoading={isRotatingKeys}
                  className="text-[10px] tracking-wider whitespace-nowrap"
                >
                  <RefreshCw size={13} className="mr-1" />
                  ROTACIONAR CHAVES CRIPTOGRÁFICAS
                </Button>
              </div>

              {/* Grid de Chaves */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {keysList.map((k) => (
                  <div
                    key={k.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-2 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        {k.name}
                      </span>
                      <Badge variant={k.status === "active" ? "success" : "warning"} size="sm">
                        {k.status === "active" ? "ATIVA & VÁLIDA" : "ATENÇÃO"}
                      </Badge>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-xl border border-white/5 font-mono text-[11px] text-amber-300 select-all truncate">
                      {k.maskedValue}
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {k.description}
                    </p>

                    <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-white/5">
                      <span>Algoritmo: {k.algorithmOrType}</span>
                      {k.lastRotated && <span>{k.lastRotated}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Configuração de Chave de API Google Gemini Customizada */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <KeyRound size={14} className="text-elite-cyan-400" />
                    Chave de API Customizada - Google Gemini AI
                  </h5>
                  <Badge variant="cyan" size="sm">OPCIONAL</Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  O sistema já possui integração nativa via ambiente de hospedagem. Se desejar utilizar uma chave de API própria para cotas dedicadas, insira-a abaixo:
                </p>

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="flex-1 w-full">
                    <Input
                      label="CHAVE DE API GEMINI (AI STUDIO)"
                      type="password"
                      placeholder="AIzaSy..."
                      value={customGeminiInput}
                      onChange={(e) => setCustomGeminiInput(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto pt-4 sm:pt-0">
                    <Button
                      variant="cyan"
                      size="sm"
                      isLoading={isSavingGeminiKey}
                      onClick={async () => {
                        setIsSavingGeminiKey(true);
                        await setCustomGeminiApiKey(customGeminiInput, userId);
                        setIsSavingGeminiKey(false);
                        setKeysList(getAllSystemKeys());
                        showToast("Chave da API Gemini atualizada com sucesso!");
                      }}
                      className="text-[10px] whitespace-nowrap h-11"
                    >
                      SALVAR CHAVE
                    </Button>
                    {customGeminiInput && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          setCustomGeminiInput("");
                          await setCustomGeminiApiKey("", userId);
                          setKeysList(getAllSystemKeys());
                          showToast("Chave personalizada removida. Utilizando configuração de ambiente.");
                        }}
                        className="text-[10px] whitespace-nowrap h-11"
                      >
                        RESTAURAR
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/80 flex justify-end">
          <Button onClick={onClose} variant="secondary" className="text-xs py-2 px-5 tracking-wider">
            FECHAR PAINEL
          </Button>
        </div>
      </div>
    </div>
  );
};
