import React, { useState, useMemo } from "react";
import {
  Users,
  UserX,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  X,
  Phone,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button, Card, Badge, IconButton } from "./UI";
import { doc, deleteDoc, updateDoc, db } from "../firebase";
import { Client, Appointment } from "../types";

interface DuplicateClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  clients: Client[];
  appointments: Appointment[];
  onClientsUpdated: (updatedClients: Client[]) => void;
  onAppointmentsUpdated: (updatedAppointments: Appointment[]) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

interface DuplicateCluster {
  id: string;
  matchType: "name" | "phone" | "both";
  matchValue: string;
  clients: Client[];
  primaryClientId: string;
}

export const DuplicateClientsModal: React.FC<DuplicateClientsModalProps> = ({
  isOpen,
  onClose,
  userId,
  clients,
  appointments,
  onClientsUpdated,
  onAppointmentsUpdated,
  showToast,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPrimaries, setSelectedPrimaries] = useState<Record<string, string>>({});

  // Helper para normalização
  const normalizeName = (name?: string) =>
    (name || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");

  const cleanPhone = (phone?: string) => (phone || "").replace(/\D/g, "");

  // Agrupamento de contatos duplicados (por nome ou telefone idêntico)
  const clusters = useMemo(() => {
    if (!clients || clients.length < 2) return [];

    // Mapeamento por connected components (Grafo de duplicidades)
    const adj = new Map<string, Set<string>>();
    clients.forEach((c) => adj.set(c.id, new Set<string>()));

    const nameMap = new Map<string, string[]>();
    const phoneMap = new Map<string, string[]>();

    clients.forEach((c) => {
      const n = normalizeName(c.name);
      if (n.length > 1) {
        const list = nameMap.get(n) || [];
        list.push(c.id);
        nameMap.set(n, list);
      }

      const p = cleanPhone(c.phone);
      if (p.length >= 8) {
        const list = phoneMap.get(p) || [];
        list.push(c.id);
        phoneMap.set(p, list);
      }
    });

    // Conectar arestas por nome idêntico
    nameMap.forEach((ids) => {
      if (ids.length > 1) {
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            adj.get(ids[i])?.add(ids[j]);
            adj.get(ids[j])?.add(ids[i]);
          }
        }
      }
    });

    // Conectar arestas por telefone idêntico
    phoneMap.forEach((ids) => {
      if (ids.length > 1) {
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            adj.get(ids[i])?.add(ids[j]);
            adj.get(ids[j])?.add(ids[i]);
          }
        }
      }
    });

    const visited = new Set<string>();
    const result: DuplicateCluster[] = [];

    const clientMap = new Map<string, Client>();
    clients.forEach((c) => clientMap.set(c.id, c));

    // Contagem de agendamentos por cliente
    const apptCountMap = new Map<string, number>();
    appointments.forEach((a) => {
      if (a.clientId) {
        apptCountMap.set(a.clientId, (apptCountMap.get(a.clientId) || 0) + 1);
      }
    });

    clients.forEach((c) => {
      if (!visited.has(c.id)) {
        const componentIds: string[] = [];
        const queue = [c.id];
        visited.add(c.id);

        while (queue.length > 0) {
          const curr = queue.shift()!;
          componentIds.push(curr);
          adj.get(curr)?.forEach((neighbor) => {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          });
        }

        if (componentIds.length > 1) {
          const clusterClients = componentIds
            .map((id) => clientMap.get(id)!)
            .filter(Boolean);

          // Determinar melhor cliente primário
          // Pontuação: Foto (+10), Telefone (+5), Histórico (+5 por agendamento), Total gasto
          const scored = clusterClients.map((client) => {
            let score = 0;
            if (client.photo) score += 10;
            if (client.phone && client.phone.trim()) score += 5;
            score += (apptCountMap.get(client.id) || 0) * 5;
            score += Math.min(client.totalSpent || 0, 500);
            if (client.lastVisit) score += 3;
            return { client, score };
          });

          scored.sort((a, b) => b.score - a.score);
          const defaultPrimaryId = scored[0].client.id;
          const chosenPrimaryId = selectedPrimaries[c.id] || defaultPrimaryId;

          // Descobrir motivo da duplicidade
          const names = new Set(clusterClients.map((cl) => normalizeName(cl.name)));
          const phones = new Set(
            clusterClients
              .map((cl) => cleanPhone(cl.phone))
              .filter((ph) => ph.length >= 8),
          );

          let matchType: "name" | "phone" | "both" = "name";
          let matchValue = clusterClients[0].name;

          if (names.size === 1 && phones.size === 1) {
            matchType = "both";
            matchValue = `${clusterClients[0].name} (${clusterClients[0].phone || "Sem tel"})`;
          } else if (phones.size === 1 && names.size > 1) {
            matchType = "phone";
            matchValue = `WhatsApp ${clusterClients[0].phone}`;
          } else {
            matchType = "name";
            matchValue = clusterClients[0].name;
          }

          result.push({
            id: c.id,
            matchType,
            matchValue,
            clients: clusterClients,
            primaryClientId: chosenPrimaryId,
          });
        }
      }
    });

    return result;
  }, [clients, appointments, selectedPrimaries]);

  const totalDuplicatesCount = useMemo(() => {
    return clusters.reduce((acc, curr) => acc + (curr.clients.length - 1), 0);
  }, [clusters]);

  if (!isOpen) return null;

  // Unifica e exclui duplicados de um único cluster
  const handleResolveCluster = async (cluster: DuplicateCluster) => {
    const primaryId = selectedPrimaries[cluster.id] || cluster.primaryClientId;
    const primary = cluster.clients.find((c) => c.id === primaryId) || cluster.clients[0];
    const duplicates = cluster.clients.filter((c) => c.id !== primary.id);

    if (duplicates.length === 0) return;

    setIsProcessing(true);
    try {
      // 1. Consolidar dados no cliente principal
      let updatedPhoto = primary.photo;
      let updatedPhone = primary.phone;
      let totalMergedSpent = primary.totalSpent || 0;
      let latestVisit = primary.lastVisit;

      duplicates.forEach((d) => {
        if (!updatedPhoto && d.photo) updatedPhoto = d.photo;
        if ((!updatedPhone || !updatedPhone.trim()) && d.phone) updatedPhone = d.phone;
        totalMergedSpent += d.totalSpent || 0;
        if (d.lastVisit) {
          if (!latestVisit || new Date(d.lastVisit) > new Date(latestVisit)) {
            latestVisit = d.lastVisit;
          }
        }
      });

      const updatedPrimaryObj: Client = {
        ...primary,
        photo: updatedPhoto,
        phone: updatedPhone,
        totalSpent: totalMergedSpent,
        lastVisit: latestVisit,
      };

      // 2. Atualizar primário no Firestore / SimDB
      await updateDoc(doc(db, "users", userId, "clients", primary.id), {
        photo: updatedPhoto || null,
        phone: updatedPhone || "",
        totalSpent: totalMergedSpent,
        lastVisit: latestVisit || null,
      });

      // 3. Re-vincular agendamentos dos clientes duplicados para o ID do primário
      const duplicateIds = new Set(duplicates.map((d) => d.id));
      const updatedAppointments = appointments.map((a) => {
        if (a.clientId && duplicateIds.has(a.clientId)) {
          return { ...a, clientId: primary.id, clientName: primary.name };
        }
        return a;
      });

      // Atualizar agendamentos alterados
      for (const a of appointments) {
        if (a.clientId && duplicateIds.has(a.clientId)) {
          try {
            await updateDoc(doc(db, "users", userId, "appointments", a.id), {
              clientId: primary.id,
              clientName: primary.name,
            });
          } catch (err) {
            console.warn(`Aviso ao redirecionar agendamento ${a.id}:`, err);
          }
        }
      }

      // 4. Excluir documentos dos clientes duplicados
      for (const d of duplicates) {
        try {
          await deleteDoc(doc(db, "users", userId, "clients", d.id));
        } catch (err) {
          console.warn(`Aviso ao excluir cliente duplicado ${d.id}:`, err);
        }
      }

      // 5. Atualizar estado do aplicativo
      const remainingClients = clients
        .filter((c) => !duplicateIds.has(c.id))
        .map((c) => (c.id === primary.id ? updatedPrimaryObj : c));

      onClientsUpdated(remainingClients);
      onAppointmentsUpdated(updatedAppointments);

      showToast(
        `Grupo "${primary.name}" unificado: ${duplicates.length} contato(s) duplicado(s) excluído(s)!`,
        "success",
      );
    } catch (err) {
      console.error("Erro ao unificar contatos duplicados:", err);
      showToast("Erro ao processar unificação de clientes.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Unifica e exclui TODOS os contatos duplicados com 1 clique
  const handleResolveAllClusters = async () => {
    if (clusters.length === 0) return;

    const confirmMsg = `Deseja unificar e excluir TODOS os ${totalDuplicatesCount} contatos duplicados encontrados?\n\nOs históricos de agendamentos e valores gastos serão preservados no contato principal de cada cliente.`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      let currentClients = [...clients];
      let currentAppointments = [...appointments];
      let deletedCount = 0;

      for (const cluster of clusters) {
        const primaryId = selectedPrimaries[cluster.id] || cluster.primaryClientId;
        const primary = cluster.clients.find((c) => c.id === primaryId) || cluster.clients[0];
        const duplicates = cluster.clients.filter((c) => c.id !== primary.id);

        if (duplicates.length === 0) continue;

        let updatedPhoto = primary.photo;
        let updatedPhone = primary.phone;
        let totalMergedSpent = primary.totalSpent || 0;
        let latestVisit = primary.lastVisit;

        duplicates.forEach((d) => {
          if (!updatedPhoto && d.photo) updatedPhoto = d.photo;
          if ((!updatedPhone || !updatedPhone.trim()) && d.phone) updatedPhone = d.phone;
          totalMergedSpent += d.totalSpent || 0;
          if (d.lastVisit) {
            if (!latestVisit || new Date(d.lastVisit) > new Date(latestVisit)) {
              latestVisit = d.lastVisit;
            }
          }
        });

        const updatedPrimaryObj: Client = {
          ...primary,
          photo: updatedPhoto,
          phone: updatedPhone,
          totalSpent: totalMergedSpent,
          lastVisit: latestVisit,
        };

        // Atualizar primário
        try {
          await updateDoc(doc(db, "users", userId, "clients", primary.id), {
            photo: updatedPhoto || null,
            phone: updatedPhone || "",
            totalSpent: totalMergedSpent,
            lastVisit: latestVisit || null,
          });
        } catch (err) {
          console.warn("Erro ao atualizar primário:", err);
        }

        const duplicateIds = new Set(duplicates.map((d) => d.id));

        // Re-vincular agendamentos
        currentAppointments = currentAppointments.map((a) => {
          if (a.clientId && duplicateIds.has(a.clientId)) {
            return { ...a, clientId: primary.id, clientName: primary.name };
          }
          return a;
        });

        for (const a of appointments) {
          if (a.clientId && duplicateIds.has(a.clientId)) {
            try {
              await updateDoc(doc(db, "users", userId, "appointments", a.id), {
                clientId: primary.id,
                clientName: primary.name,
              });
            } catch {}
          }
        }

        // Excluir duplicados
        for (const d of duplicates) {
          try {
            await deleteDoc(doc(db, "users", userId, "clients", d.id));
            deletedCount++;
          } catch (err) {
            console.warn("Erro ao deletar:", err);
          }
        }

        currentClients = currentClients
          .filter((c) => !duplicateIds.has(c.id))
          .map((c) => (c.id === primary.id ? updatedPrimaryObj : c));
      }

      onClientsUpdated(currentClients);
      onAppointmentsUpdated(currentAppointments);

      showToast(
        `Sucesso! ${deletedCount} contatos duplicados foram excluídos e históricos unificados.`,
        "success",
      );
      onClose();
    } catch (err) {
      console.error("Erro ao resolver todos os duplicados:", err);
      showToast("Ocorreu um erro durante a exclusão em massa.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Exclui um único contato específico diretamente
  const handleDeleteSingleDuplicate = async (clientToDelete: Client) => {
    if (!window.confirm(`Excluir permanentemente o contato de "${clientToDelete.name}"?`)) return;

    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, "users", userId, "clients", clientToDelete.id));

      const updated = clients.filter((c) => c.id !== clientToDelete.id);
      onClientsUpdated(updated);
      showToast(`Contato "${clientToDelete.name}" excluído com sucesso!`);
    } catch (err) {
      console.error("Erro ao excluir contato:", err);
      showToast("Erro ao excluir contato.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                  Limpeza de Contatos Duplicados
                </h3>
                {totalDuplicatesCount > 0 && (
                  <span className="bg-elite-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {totalDuplicatesCount} duplicados
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Detecte clientes repetidos, unifique históricos e remova cadastros duplicados
              </p>
            </div>
          </div>
          <IconButton
            icon={<X size={18} />}
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
            title="Fechar"
          />
        </div>

        {/* Conteúdo Principal com Rolagem */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {clusters.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4 bg-slate-950/40 rounded-3xl border border-white/5">
              <div className="h-16 w-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h4 className="text-white font-black text-lg">Nenhum Contato Duplicado!</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Sua lista de clientes está totalmente organizada. Não encontramos contatos com nomes ou números de WhatsApp repetidos.
                </p>
              </div>
              <Button variant="primary" size="md" onClick={onClose} className="mt-2">
                Fechar Janela
              </Button>
            </div>
          ) : (
            <>
              {/* Banner de Ação em Massa */}
              <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-elite-red-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                    <span className="text-xs font-black uppercase text-white tracking-wider">
                      {clusters.length} grupo(s) com contatos repetidos
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Ao unificar, os agendamentos e valores gastos serão somados ao contato principal. O número de WhatsApp e foto também serão preservados.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  icon={<Sparkles size={16} />}
                  isLoading={isProcessing}
                  disabled={isProcessing}
                  onClick={handleResolveAllClusters}
                  className="w-full sm:w-auto shrink-0 py-3 text-xs font-black shadow-lg shadow-elite-red-500/20"
                >
                  EXCLUIR TODOS OS DUPLICADOS ({totalDuplicatesCount})
                </Button>
              </div>

              {/* Lista de Grupos de Duplicados */}
              <div className="space-y-4">
                {clusters.map((cluster, clusterIdx) => {
                  const primaryId = selectedPrimaries[cluster.id] || cluster.primaryClientId;

                  return (
                    <div
                      key={cluster.id}
                      className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-lg bg-white/10 text-white text-[11px] font-black flex items-center justify-center">
                            {clusterIdx + 1}
                          </span>
                          <div>
                            <span className="text-sm font-bold text-white">
                              {cluster.matchValue}
                            </span>
                            <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                              {cluster.matchType === "both"
                                ? "Nome e Telefone Iguais"
                                : cluster.matchType === "phone"
                                ? "Mesmo WhatsApp"
                                : "Mesmo Nome"}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleResolveCluster(cluster)}
                          icon={<ShieldCheck size={14} className="text-emerald-400" />}
                          className="text-xs font-bold shrink-0 self-start sm:self-auto"
                        >
                          Unificar este Grupo
                        </Button>
                      </div>

                      {/* Lista de Clientes dentro do Grupo */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cluster.clients.map((c) => {
                          const isPrimary = c.id === primaryId;
                          const clientApptsCount = appointments.filter(
                            (a) => a.clientId === c.id,
                          ).length;

                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedPrimaries((prev) => ({
                                  ...prev,
                                  [cluster.id]: c.id,
                                }));
                              }}
                              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                                isPrimary
                                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/5"
                                  : "bg-slate-900/80 border-white/5 hover:border-white/20"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="h-11 w-11 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shrink-0">
                                    {c.photo ? (
                                      <img
                                        src={c.photo}
                                        alt={c.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center text-slate-400 font-black text-sm">
                                        {(c.name || "C")[0].toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <h5 className="text-xs font-black text-white truncate">
                                        {c.name}
                                      </h5>
                                    </div>
                                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                      <Phone size={11} className="text-slate-500" />
                                      {c.phone || "Sem telefone"}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  {isPrimary ? (
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <CheckCircle2 size={10} /> Manter
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-elite-red-500/20 text-elite-red-400 border border-elite-red-500/30 px-2 py-0.5 rounded-md">
                                      Será Excluído
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Estatísticas do Contato */}
                              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={11} className="text-slate-500" />
                                    {clientApptsCount} agendamento(s)
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <DollarSign size={11} className="text-slate-500" />
                                    R$ {(c.totalSpent || 0).toFixed(2)}
                                  </span>
                                </div>

                                {!isPrimary && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSingleDuplicate(c);
                                    }}
                                    className="text-slate-500 hover:text-elite-red-400 p-1 transition-colors"
                                    title="Excluir apenas este contato agora"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            {clusters.length > 0
              ? `${clusters.length} grupo(s) detectado(s)`
              : "Nenhuma duplicidade"}
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
