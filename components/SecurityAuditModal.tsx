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
  getAllLocalVaultAccounts,
  syncVaultWithFirestore,
  StoredAccount,
} from "../services/credentialsVault";

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
  const [activeTab, setActiveTab] = useState<"overview" | "links" | "2fa" | "accounts" | "logs">("overview");
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<SecurityLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Vault Accounts State
  const [vaultAccounts, setVaultAccounts] = useState<Record<string, StoredAccount>>({});
  const [isSyncingVault, setIsSyncingVault] = useState(false);

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

  // Load audit data & logs when modal opens
  useEffect(() => {
    if (!isOpen) return;

    loadAudit();
    loadLogs();
    loadVaultAccounts();
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-elite-red-500/10 border border-elite-red-500/20 flex items-center justify-center text-elite-red-400">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
                  Central de Segurança & Auditoria
                </h3>
                {auditResult && (
                  <Badge variant={auditResult.score >= 90 ? "success" : "warning"} className="text-[9px]">
                    {auditResult.score}% Protegido
                  </Badge>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                Controle criptográfico de links, proteção contra força bruta e isolamento de agendamentos.
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
        <div className="flex border-b border-white/10 bg-slate-950/30 px-4 sm:px-6 gap-2 sm:gap-4 overflow-x-auto text-[11px] font-black uppercase tracking-wider">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "overview"
                ? "border-elite-red-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity size={14} />
            <span>Varredura & Diagnóstico</span>
          </button>
          <button
            onClick={() => setActiveTab("links")}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "links"
                ? "border-elite-red-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lock size={14} />
            <span>Links Criptografados</span>
          </button>
          <button
            onClick={() => setActiveTab("2fa")}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "2fa"
                ? "border-elite-red-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound size={14} />
            <span>2FA & Acesso</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("accounts");
              loadVaultAccounts();
            }}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "accounts"
                ? "border-elite-red-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck size={14} />
            <span>Credenciais Salvas</span>
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`py-3.5 px-3 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "logs"
                ? "border-elite-red-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText size={14} />
            <span>Logs de Auditoria ({logs.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                      Integridade do Sistema
                    </span>
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white">{auditResult?.score || 100}%</div>
                  <p className="text-[10px] text-slate-400 mt-1">Classificação: {auditResult?.rating || "Excelente"}</p>
                </div>

                <div className="p-4 rounded-2xl bg-elite-red-500/10 border border-elite-red-500/20 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-elite-red-400 uppercase tracking-widest">
                      Links Assinados
                    </span>
                    <Lock size={16} className="text-elite-red-400" />
                  </div>
                  <div className="text-2xl font-black text-white">HMAC-SHA256</div>
                  <p className="text-[10px] text-slate-400 mt-1">Proteção anti-adulteração ativa</p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                      Autenticação 2FA
                    </span>
                    <UserCheck size={16} className="text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-white">
                    {twoFactorConfig.enabled ? "Ativado" : "Opcional"}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {twoFactorConfig.enabled ? "PIN de 6 dígitos ativo" : "Recomendado para gestores"}
                  </p>
                </div>
              </div>

              {/* Security Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Varredura de Camadas de Proteção
                  </h4>
                  <Button
                    onClick={loadAudit}
                    disabled={isScanning}
                    variant="outline"
                    className="py-1.5 px-3 text-[10px] tracking-wider"
                  >
                    <RefreshCw size={12} className={isScanning ? "animate-spin mr-1.5" : "mr-1.5"} />
                    {isScanning ? "Verificando..." : "Nova Varredura"}
                  </Button>
                </div>

                <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-slate-950/40">
                  {auditResult?.items.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-start gap-3 text-left">
                      <div className="mt-0.5 shrink-0">
                        {item.status === "pass" ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : item.status === "warning" ? (
                          <AlertTriangle size={16} className="text-amber-400" />
                        ) : (
                          <XCircle size={16} className="text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">{item.name}</p>
                          <Badge
                            variant={item.status === "pass" ? "success" : item.status === "warning" ? "warning" : "error"}
                            className="text-[8px] py-0 px-1.5 uppercase"
                          >
                            {item.status === "pass" ? "Verificado" : item.status === "warning" ? "Aviso" : "Falha"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>
                        {item.remediation && (
                          <p className="text-[10px] text-amber-300/90 mt-1 font-medium bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                            💡 Sugestão: {item.remediation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENCRYPTED LINKS */}
          {activeTab === "links" && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-elite-red-500/10 border border-elite-red-500/20 flex items-start gap-3">
                <Lock size={18} className="text-elite-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-white uppercase tracking-wider">
                    Gerador de Links Criptografados & Assinados
                  </p>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Nenhum parâmetro sensível (como IDs internos) é exposto em texto simples. Os links são protegidos por tokens assinados com chave HMAC-SHA256, possuem expiração automática e podem ser configurados para uso único com proteção contra replay.
                  </p>
                </div>
              </div>

              {/* Form Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    Prazo de Expiração:
                  </label>
                  <select
                    value={linkDurationHours}
                    onChange={(e) => setLinkDurationHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-elite-red-500"
                  >
                    <option value={24}>24 Horas (Temporário)</option>
                    <option value={72}>3 Dias (Fim de semana)</option>
                    <option value={168}>7 Dias (Padrão Recomendado)</option>
                    <option value={720}>30 Dias (Campanha)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    Tipo de Acesso:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSingleUse(false)}
                      className={`flex-1 py-2 px-2 text-[10px] font-black uppercase rounded-xl border transition-all cursor-pointer ${
                        !isSingleUse
                          ? "bg-elite-red-500/20 border-elite-red-500 text-white"
                          : "bg-slate-950 border-white/10 text-slate-400"
                      }`}
                    >
                      Padrão (Reutilizável)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSingleUse(true)}
                      className={`flex-1 py-2 px-2 text-[10px] font-black uppercase rounded-xl border transition-all cursor-pointer ${
                        isSingleUse
                          ? "bg-elite-red-500/20 border-elite-red-500 text-white"
                          : "bg-slate-950 border-white/10 text-slate-400"
                      }`}
                    >
                      Uso Único (1x)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    Cliente Específico (Opcional):
                  </label>
                  <Input
                    placeholder="Ex: João Silva"
                    value={targetClientName}
                    onChange={(e) => setTargetClientName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerateLink}
                  isLoading={isGeneratingLink}
                  className="tracking-wider text-xs py-2.5"
                >
                  GERAR NOVO LINK CRIPTOGRAFADO
                </Button>
              </div>

              {/* Output Display */}
              {generatedLink && (
                <div className="space-y-3 p-4 bg-slate-950 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> Link Assinado e Pronto para Uso
                    </span>
                    <span className="text-[9px] text-slate-400">
                      Válido por {linkDurationHours}h {isSingleUse ? "• Uso Único" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-xl border border-white/5">
                    <input
                      readOnly
                      value={generatedLink}
                      className="bg-transparent text-[11px] font-mono text-elite-cyan-300 w-full focus:outline-none select-all truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedLink)}
                      className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                      title="Copiar Link"
                    >
                      <Copy size={14} />
                    </button>
                    <a
                      href={generatedLink}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                      title="Testar Link em Nova Aba"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const msg = `Olá! Segue seu link seguro para agendamento na barbearia: ${generatedLink}`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
                      }}
                      className="py-2 px-3 text-[10px] font-bold text-white bg-emerald-600/80 hover:bg-emerald-600 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Share2 size={12} /> Compartilhar no WhatsApp
                    </button>
                  </div>
                </div>
              )}

              {/* Revoke All Warning */}
              <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-white">Revogação Imediata de Links</p>
                  <p className="text-[10px] text-slate-400">
                    Rotaciona a chave de assinatura HMAC. Todos os links distribuídos anteriormente serão invalidados instantaneamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRevokeTokens}
                  className="py-2 px-3.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
                >
                  Revogar Todos os Links
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: 2FA & ACCESS CONTROL */}
          {activeTab === "2fa" && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <KeyRound size={18} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-white uppercase tracking-wider">
                    Autenticação em Dois Fatores (2FA) & Controle de Acesso
                  </p>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Exige uma segunda etapa de validação com PIN de segurança de 6 dígitos no momento do login para impedir acesso não autorizado ao painel gerencial.
                  </p>
                </div>
              </div>

              {/* 2FA Toggle & PIN setup */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider">
                      Status do 2FA para Administradores
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {twoFactorConfig.enabled
                        ? "Ativado • Login exige senha + PIN de 6 dígitos"
                        : "Desativado • Login exige apenas usuário e senha"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFactorState((prev) => ({ ...prev, enabled: !prev.enabled }));
                    }}
                    className={`py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border ${
                      twoFactorConfig.enabled
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-slate-800 border-white/10 text-slate-400"
                    }`}
                  >
                    {twoFactorConfig.enabled ? "Ativado" : "Desativado"}
                  </button>
                </div>

                {twoFactorConfig.enabled && (
                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Definir Novo PIN de Segurança (6 Dígitos Numéricos):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="PIN DE 6 DÍGITOS"
                        type="password"
                        maxLength={6}
                        placeholder="Ex: 372087"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                      <Input
                        label="CONFIRMAR PIN"
                        type="password"
                        maxLength={6}
                        placeholder="Repita os 6 dígitos"
                        value={pinConfirmInput}
                        onChange={(e) => setPinConfirmInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSave2FA}
                  isLoading={isSaving2FA}
                  className="w-full tracking-wider text-xs py-3 mt-2"
                >
                  SALVAR CONFIGURAÇÃO DO 2FA
                </Button>
              </div>

              {/* Automatic Protections Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-elite-cyan-400">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Encerramento por Inatividade
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Sua sessão é automaticamente encerrada após 15 minutos de inatividade com aviso prévio de 60 segundos para evitar acessos indevidos em computadores compartilhados.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-amber-400">
                    <ShieldAlert size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Proteção Anti-Força Bruta
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Bloqueio exponencial automático após 5 tentativas consecutivas de senha incorreta, com tempo de espera de 60 segundos e registro imediato de incidente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-4 text-left animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Registro de Auditoria em Tempo Real
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Histórico imutável de logins, validações de tokens, alterações de credenciais e alertas.
                  </p>
                </div>
                <Button
                  onClick={loadLogs}
                  disabled={isLoadingLogs}
                  variant="outline"
                  className="py-1.5 px-3 text-[10px] tracking-wider"
                >
                  <RefreshCw size={12} className={isLoadingLogs ? "animate-spin mr-1.5" : "mr-1.5"} />
                  Atualizar
                </Button>
              </div>

              <div className="max-h-[380px] overflow-y-auto border border-white/10 rounded-2xl bg-slate-950/60 divide-y divide-white/5">
                {logs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs font-medium">
                    Nenhum log registrado ainda.
                  </div>
                ) : (
                  logs.map((log, index) => {
                    const isCrit = log.severity === "critical" || log.type === "brute_force_cooldown" || log.type === "token_tampered";
                    const isWarn = log.severity === "warning" || log.type === "login_failed" || log.type === "token_expired";

                    return (
                      <div key={log.id || index} className="p-3 text-left hover:bg-white/[0.02] transition-colors flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {isCrit ? (
                            <ShieldAlert size={14} className="text-red-400 animate-pulse" />
                          ) : isWarn ? (
                            <AlertTriangle size={14} className="text-amber-400" />
                          ) : (
                            <CheckCircle2 size={14} className="text-emerald-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">
                              {log.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {new Date(log.timestampMs || log.timestamp).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          {log.details && (
                            <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">{log.details}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-[8px] text-slate-500 font-mono">
                            <span>Usuário: {log.username}</span>
                            <span>Severidade: {log.severity || "info"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SAVED CREDENTIALS & ACCOUNTS VAULT */}
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
                              <Badge variant="success" className="text-[8px]">ATIVO</Badge>
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60 flex justify-end">
          <Button onClick={onClose} variant="secondary" className="text-xs py-2 px-5 tracking-wider">
            FECHAR PAINEL
          </Button>
        </div>
      </div>
    </div>
  );
};
