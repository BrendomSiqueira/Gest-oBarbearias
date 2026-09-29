import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Clock,
  UserCheck,
  UserX,
  RefreshCw,
  X,
  Key,
  Smartphone,
  AlertTriangle,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Card, Badge, Button, IconButton } from "./UI";
import { SecurityLogEntry, fetchSecurityLogs, getStoredSession } from "../services/authSecurity";

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onForceLogout: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({
  isOpen,
  onClose,
  userId,
  onForceLogout,
  showToast,
}) => {
  const [logs, setLogs] = useState<SecurityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "success" | "failed" | "reset">("all");

  const currentSession = getStoredSession();

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSecurityLogs(userId);
      setLogs(data);
    } catch {
      showToast("Não foi possível carregar os logs de segurança.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((l) => {
    if (filterType === "success") return l.type === "login_success";
    if (filterType === "failed") return l.type === "login_failed" || l.type === "brute_force_cooldown";
    if (filterType === "reset") return l.type.includes("password_reset");
    return true;
  });

  const successCount = logs.filter((l) => l.type === "login_success").length;
  const failedCount = logs.filter((l) => l.type === "login_failed" || l.type === "brute_force_cooldown").length;
  const resetCount = logs.filter((l) => l.type.includes("password_reset")).length;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-elite-cyan-500/10 border border-elite-cyan-500/20 text-elite-cyan-400 rounded-xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase italic tracking-wide">
                  Painel de Auditoria de Acessos & Segurança
                </h3>
                <Badge variant="success" size="sm">
                  Ativo & Monitorado
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Rastreabilidade de autenticações, tentativas de login, bloqueios por força bruta e controle de sessão.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Security Overview Cards */}
        <div className="p-6 border-b border-white/10 bg-slate-900/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950/80 border border-emerald-500/20 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Acessos com Sucesso</span>
              <UserCheck size={16} />
            </div>
            <h4 className="text-2xl font-black text-white font-mono">{successCount}</h4>
            <p className="text-[10px] text-slate-400 mt-1">Autenticações válidas</p>
          </div>

          <div className="bg-slate-950/80 border border-rose-500/20 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-rose-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Tentativas Falhas</span>
              <UserX size={16} />
            </div>
            <h4 className="text-2xl font-black text-rose-400 font-mono">{failedCount}</h4>
            <p className="text-[10px] text-slate-400 mt-1">Erros de senha / bloqueios</p>
          </div>

          <div className="bg-slate-950/80 border border-elite-cyan-500/20 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-elite-cyan-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Redefinições de Senha</span>
              <Key size={16} />
            </div>
            <h4 className="text-2xl font-black text-white font-mono">{resetCount}</h4>
            <p className="text-[10px] text-slate-400 mt-1">Recuperações seguras</p>
          </div>

          <div className="bg-slate-950/80 border border-amber-500/20 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-amber-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Tempo Inatividade</span>
              <Clock size={16} />
            </div>
            <h4 className="text-2xl font-black text-white font-mono">15 min</h4>
            <p className="text-[10px] text-slate-400 mt-1">Auto-logout de segurança</p>
          </div>
        </div>

        {/* Current Session Card */}
        {currentSession && (
          <div className="px-6 py-4 border-b border-white/10 bg-slate-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="text-xs font-black text-white uppercase">
                  Sessão Ativa: <span className="text-elite-cyan-400">{currentSession.displayName}</span> ({currentSession.username})
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Login iniciado em: {new Date(currentSession.loginTime).toLocaleTimeString("pt-BR")} • ID Sessão:{" "}
                  {currentSession.sessionId.substring(0, 16)}...
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onForceLogout();
                onClose();
              }}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0"
            >
              Encerrar Sessão Agora
            </button>
          </div>
        )}

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between gap-2 flex-wrap bg-slate-900/40">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                filterType === "all" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Todos ({logs.length})
            </button>
            <button
              onClick={() => setFilterType("success")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                filterType === "success" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Sucessos ({successCount})
            </button>
            <button
              onClick={() => setFilterType("failed")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                filterType === "failed" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Falhas ({failedCount})
            </button>
            <button
              onClick={() => setFilterType("reset")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                filterType === "reset" ? "bg-elite-cyan-500/20 text-elite-cyan-300 border border-elite-cyan-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Redefinições ({resetCount})
            </button>
          </div>

          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-[10px] font-black uppercase cursor-pointer"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, idx) => {
              const isSuccess = log.type === "login_success";
              const isFailed = log.type === "login_failed" || log.type === "brute_force_cooldown";
              const isReset = log.type.includes("password_reset");

              return (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isSuccess
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : isFailed
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-elite-cyan-500/10 text-elite-cyan-400 border border-elite-cyan-500/20"
                      }`}
                    >
                      {isSuccess ? <UserCheck size={16} /> : isFailed ? <UserX size={16} /> : <Key size={16} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white uppercase">{log.username}</span>
                        <Badge
                          variant={isSuccess ? "success" : isFailed ? "danger" : "info"}
                          size="sm"
                        >
                          {isSuccess
                            ? "Login Realizado"
                            : isFailed
                            ? log.type === "brute_force_cooldown"
                              ? "Bloqueio Temporário"
                              : "Falha de Senha"
                            : "Redefinição"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{log.details || "Ação registrada pelo sistema"}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-mono font-bold text-slate-300">
                      {new Date(log.timestampMs).toLocaleDateString("pt-BR")} às{" "}
                      {new Date(log.timestampMs).toLocaleTimeString("pt-BR")}
                    </p>
                    <p className="text-[9px] text-slate-500 truncate max-w-[200px]" title={log.userAgent}>
                      Dispositivo autenticado
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-slate-500">
              <ShieldCheck size={36} className="mx-auto mb-2 text-slate-600" />
              <p className="text-xs font-bold uppercase tracking-wider">Nenhum evento registrado para este filtro</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
