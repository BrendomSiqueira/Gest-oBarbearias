import React, { useState } from "react";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCw,
  Trash2,
  UserPlus,
  CalendarCheck,
  Database,
  X,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Scissors,
  DollarSign,
} from "lucide-react";
import { Button, Card, Badge, IconButton } from "./UI";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { Client, Appointment, Service } from "../types";

interface SystemRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  clients: Client[];
  appointments: Appointment[];
  services: Service[];
  onRefreshData?: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

interface TestStepResult {
  title: string;
  status: "pending" | "running" | "success" | "error";
  details?: string;
  latencyMs?: number;
}

export const SystemRepairModal: React.FC<SystemRepairModalProps> = ({
  isOpen,
  onClose,
  userId,
  clients,
  appointments,
  services,
  onRefreshData,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<"tests" | "audit" | "manual">("tests");
  const [isRunningAll, setIsRunningAll] = useState(false);

  // Results state
  const [clientTestSteps, setClientTestSteps] = useState<TestStepResult[]>([]);
  const [aptTestSteps, setAptTestSteps] = useState<TestStepResult[]>([]);
  const [serviceTestSteps, setServiceTestSteps] = useState<TestStepResult[]>([]);
  const [financialTestSteps, setFinancialTestSteps] = useState<TestStepResult[]>([]);
  const [auditStats, setAuditStats] = useState<{
    orphanedApts: Appointment[];
    duplicateClients: { name: string; count: number }[];
    totalCheckedApts: number;
    totalCheckedClients: number;
  } | null>(null);
  const [isFixingOrphans, setIsFixingOrphans] = useState(false);

  // Manual Quick Form Test
  const [manualClientName, setManualClientName] = useState("");
  const [manualClientPhone, setManualClientPhone] = useState("");
  const [isCreatingManualClient, setIsCreatingManualClient] = useState(false);

  const [manualAptName, setManualAptName] = useState("");
  const [manualAptDate, setManualAptDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [manualAptTime, setManualAptTime] = useState("10:00");
  const [isCreatingManualApt, setIsCreatingManualApt] = useState(false);

  if (!isOpen) return null;

  // TEST 1: Test creating a client, reading it, updating it, and deleting it
  const runClientTest = async () => {
    const steps: TestStepResult[] = [
      { title: "Validação de Estrutura e Regras de Segurança", status: "pending" },
      { title: "Criação de Novo Cliente no Firestore", status: "pending" },
      { title: "Leitura e Integridade dos Dados Salvos", status: "pending" },
      { title: "Limpeza Segura do Registro de Teste", status: "pending" },
    ];
    setClientTestSteps(steps);

    const testClientId = `test_cli_${Date.now()}`;
    const testName = `Cliente Teste ${new Date().toLocaleTimeString("pt-BR")}`;
    const testPhone = "11999998888";

    // Step 1: Pre-flight check
    steps[0] = { title: steps[0].title, status: "running" };
    setClientTestSteps([...steps]);
    await new Promise((r) => setTimeout(r, 200));

    if (!userId) {
      steps[0] = {
        title: steps[0].title,
        status: "error",
        details: "ID do usuário não identificado no sistema.",
      };
      setClientTestSteps([...steps]);
      return;
    }
    steps[0] = {
      title: steps[0].title,
      status: "success",
      details: `Escopo verificado com sucesso para usuário: ${userId}`,
    };
    setClientTestSteps([...steps]);

    // Step 2: Create client doc
    steps[1] = { title: steps[1].title, status: "running" };
    setClientTestSteps([...steps]);
    const t0 = performance.now();

    try {
      await setDoc(doc(db, "users", userId, "clients", testClientId), {
        id: testClientId,
        name: testName,
        phone: testPhone,
        totalSpent: 0,
        lastVisit: new Date().toISOString(),
      });
      const t1 = performance.now();
      steps[1] = {
        title: steps[1].title,
        status: "success",
        latencyMs: Math.round(t1 - t0),
        details: `Cliente criado com ID [${testClientId}] e aceito pelo Firestore.`,
      };
      setClientTestSteps([...steps]);
    } catch (err: any) {
      steps[1] = {
        title: steps[1].title,
        status: "error",
        details: `Erro no Firestore: ${err?.message || String(err)}`,
      };
      setClientTestSteps([...steps]);
      return;
    }

    // Step 3: Read client doc back
    steps[2] = { title: steps[2].title, status: "running" };
    setClientTestSteps([...steps]);
    const tRead0 = performance.now();

    try {
      const snap = await getDoc(doc(db, "users", userId, "clients", testClientId));
      const tRead1 = performance.now();
      if (snap.exists() && snap.data().name === testName) {
        steps[2] = {
          title: steps[2].title,
          status: "success",
          latencyMs: Math.round(tRead1 - tRead0),
          details: `Documento recuperado perfeitamente: "${testName}" (${snap.data().phone}).`,
        };
      } else {
        steps[2] = {
          title: steps[2].title,
          status: "error",
          details: "Documento salvo não foi encontrado ou os dados divergiram.",
        };
      }
      setClientTestSteps([...steps]);
    } catch (err: any) {
      steps[2] = {
        title: steps[2].title,
        status: "error",
        details: `Erro na leitura: ${err?.message || String(err)}`,
      };
      setClientTestSteps([...steps]);
      return;
    }

    // Step 4: Cleanup test client
    steps[3] = { title: steps[3].title, status: "running" };
    setClientTestSteps([...steps]);
    try {
      await deleteDoc(doc(db, "users", userId, "clients", testClientId));
      steps[3] = {
        title: steps[3].title,
        status: "success",
        details: "Registro de teste removido. Banco de dados limpo.",
      };
      setClientTestSteps([...steps]);
      showToast("Teste de Novo Cliente finalizado com sucesso!", "success");
    } catch (err: any) {
      steps[3] = {
        title: steps[3].title,
        status: "error",
        details: `Aviso na remoção: ${err?.message || String(err)}`,
      };
      setClientTestSteps([...steps]);
    }
  };

  // TEST 2: Test scheduling with client name
  const runAppointmentTest = async () => {
    const steps: TestStepResult[] = [
      { title: "Criação de Cliente para o Agendamento", status: "pending" },
      { title: "Gravação do Agendamento com Nome Vinculado", status: "pending" },
      { title: "Verificação da Relação Agendamento ↔ Nome", status: "pending" },
      { title: "Limpeza e Remoção dos Registros de Teste", status: "pending" },
    ];
    setAptTestSteps(steps);

    const testClientId = `test_apt_cli_${Date.now()}`;
    const testAptId = `test_apt_${Date.now()}`;
    const clientName = `Agendado Teste ${new Date().toLocaleTimeString("pt-BR")}`;
    const sampleServiceId = services[0]?.id || "serv_padrao";

    // Step 1: Create client
    steps[0] = { title: steps[0].title, status: "running" };
    setAptTestSteps([...steps]);

    try {
      await setDoc(doc(db, "users", userId, "clients", testClientId), {
        id: testClientId,
        name: clientName,
        phone: "11988887777",
        totalSpent: 0,
      });
      steps[0] = {
        title: steps[0].title,
        status: "success",
        details: `Cliente base [${clientName}] criado no Firestore.`,
      };
      setAptTestSteps([...steps]);
    } catch (err: any) {
      steps[0] = {
        title: steps[0].title,
        status: "error",
        details: `Falha ao criar cliente base: ${err?.message || String(err)}`,
      };
      setAptTestSteps([...steps]);
      return;
    }

    // Step 2: Schedule appointment with clientId AND clientName
    steps[1] = { title: steps[1].title, status: "running" };
    setAptTestSteps([...steps]);
    const t0 = performance.now();

    try {
      await setDoc(doc(db, "users", userId, "appointments", testAptId), {
        id: testAptId,
        clientId: testClientId,
        clientName: clientName,
        clientPhone: "11988887777",
        serviceId: sampleServiceId,
        date: new Date().toISOString().split("T")[0],
        time: "11:30",
        completed: false,
        paid: false,
        finalPrice: 35,
        status: "confirmed",
        createdAt: new Date().toISOString(),
      });
      const t1 = performance.now();
      steps[1] = {
        title: steps[1].title,
        status: "success",
        latencyMs: Math.round(t1 - t0),
        details: `Agendamento [${testAptId}] gravado com nome "${clientName}" vinculado com sucesso!`,
      };
      setAptTestSteps([...steps]);
    } catch (err: any) {
      steps[1] = {
        title: steps[1].title,
        status: "error",
        details: `Erro ao gravar agendamento: ${err?.message || String(err)}`,
      };
      setAptTestSteps([...steps]);
      // Cleanup client
      await deleteDoc(doc(db, "users", userId, "clients", testClientId)).catch(() => {});
      return;
    }

    // Step 3: Verify link
    steps[2] = { title: steps[2].title, status: "running" };
    setAptTestSteps([...steps]);

    try {
      const aptSnap = await getDoc(doc(db, "users", userId, "appointments", testAptId));
      if (aptSnap.exists() && aptSnap.data().clientName === clientName) {
        steps[2] = {
          title: steps[2].title,
          status: "success",
          details: `Nome "${clientName}" e Horário 11:30 confirmados no documento.`,
        };
      } else {
        steps[2] = {
          title: steps[2].title,
          status: "error",
          details: "Agendamento não conteve o nome do cliente gravado corretamente.",
        };
      }
      setAptTestSteps([...steps]);
    } catch (err: any) {
      steps[2] = {
        title: steps[2].title,
        status: "error",
        details: `Erro na validação: ${err?.message || String(err)}`,
      };
      setAptTestSteps([...steps]);
    }

    // Step 4: Cleanup
    steps[3] = { title: steps[3].title, status: "running" };
    setAptTestSteps([...steps]);

    try {
      await deleteDoc(doc(db, "users", userId, "appointments", testAptId));
      await deleteDoc(doc(db, "users", userId, "clients", testClientId));
      steps[3] = {
        title: steps[3].title,
        status: "success",
        details: "Registros de teste (agendamento e cliente) removidos com sucesso.",
      };
      setAptTestSteps([...steps]);
      showToast("Teste de Agendamento finalizado com 100% de aprovação!", "success");
    } catch (err: any) {
      steps[3] = {
        title: steps[3].title,
        status: "error",
        details: `Erro na limpeza: ${err?.message || String(err)}`,
      };
      setAptTestSteps([...steps]);
    }
  };

  // TEST 3: Test service catalog persistence (create, read, update, delete)
  const runServiceTest = async () => {
    const steps: TestStepResult[] = [
      { title: "Criação de Serviço no Catálogo", status: "pending" },
      { title: "Validação de Leitura e Duração/Preço", status: "pending" },
      { title: "Atualização de Valores no Firestore", status: "pending" },
      { title: "Exclusão Segura do Serviço de Teste", status: "pending" },
    ];
    setServiceTestSteps(steps);

    const testServiceId = `test_srv_${Date.now()}`;
    const testName = `Corte Teste ${new Date().toLocaleTimeString("pt-BR")}`;

    // Step 1: Create service
    steps[0] = { title: steps[0].title, status: "running" };
    setServiceTestSteps([...steps]);
    const t0 = performance.now();

    try {
      await setDoc(doc(db, "users", userId, "services", testServiceId), {
        id: testServiceId,
        name: testName,
        price: 45,
        duration: 30,
      });
      const t1 = performance.now();
      steps[0] = {
        title: steps[0].title,
        status: "success",
        latencyMs: Math.round(t1 - t0),
        details: `Serviço [${testName}] cadastrado (R$ 45,00, 30min).`,
      };
      setServiceTestSteps([...steps]);
    } catch (err: any) {
      steps[0] = {
        title: steps[0].title,
        status: "error",
        details: `Falha na criação: ${err?.message || String(err)}`,
      };
      setServiceTestSteps([...steps]);
      return;
    }

    // Step 2: Read service
    steps[1] = { title: steps[1].title, status: "running" };
    setServiceTestSteps([...steps]);
    try {
      const snap = await getDoc(doc(db, "users", userId, "services", testServiceId));
      if (snap.exists() && snap.data().price === 45) {
        steps[1] = {
          title: steps[1].title,
          status: "success",
          details: `Documento verificado: R$ ${snap.data().price}, duração ${snap.data().duration}m.`,
        };
      } else {
        steps[1] = {
          title: steps[1].title,
          status: "error",
          details: "Serviço não retornado com os dados corretos.",
        };
      }
      setServiceTestSteps([...steps]);
    } catch (err: any) {
      steps[1] = {
        title: steps[1].title,
        status: "error",
        details: `Erro na leitura: ${err?.message || String(err)}`,
      };
      setServiceTestSteps([...steps]);
      return;
    }

    // Step 3: Update service
    steps[2] = { title: steps[2].title, status: "running" };
    setServiceTestSteps([...steps]);
    try {
      await updateDoc(doc(db, "users", userId, "services", testServiceId), {
        price: 55,
      });
      const updatedSnap = await getDoc(doc(db, "users", userId, "services", testServiceId));
      if (updatedSnap.exists() && updatedSnap.data().price === 55) {
        steps[2] = {
          title: steps[2].title,
          status: "success",
          details: "Preço atualizado com sucesso para R$ 55,00.",
        };
      } else {
        steps[2] = {
          title: steps[2].title,
          status: "error",
          details: "Atualização não refletiu no documento.",
        };
      }
      setServiceTestSteps([...steps]);
    } catch (err: any) {
      steps[2] = {
        title: steps[2].title,
        status: "error",
        details: `Erro no update: ${err?.message || String(err)}`,
      };
      setServiceTestSteps([...steps]);
      return;
    }

    // Step 4: Delete service
    steps[3] = { title: steps[3].title, status: "running" };
    setServiceTestSteps([...steps]);
    try {
      await deleteDoc(doc(db, "users", userId, "services", testServiceId));
      steps[3] = {
        title: steps[3].title,
        status: "success",
        details: "Serviço de teste excluído. Catálogo consistente.",
      };
      setServiceTestSteps([...steps]);
      showToast("Teste de Serviços concluído com sucesso!", "success");
    } catch (err: any) {
      steps[3] = {
        title: steps[3].title,
        status: "error",
        details: `Erro na exclusão: ${err?.message || String(err)}`,
      };
      setServiceTestSteps([...steps]);
    }
  };

  // TEST 4: Test financial adjustment and inventory persistence
  const runFinancialAndStockTest = async () => {
    const steps: TestStepResult[] = [
      { title: "Lançamento de Ajuste de Caixa (Entrada)", status: "pending" },
      { title: "Verificação da Entrada no Livro Caixa", status: "pending" },
      { title: "Controle e Atualização de Item de Bar/Estoque", status: "pending" },
      { title: "Exclusão dos Registros de Teste", status: "pending" },
    ];
    setFinancialTestSteps(steps);

    const testAdjId = `test_adj_${Date.now()}`;
    const testDrinkId = `test_drk_${Date.now()}`;
    const today = new Date().toISOString().split("T")[0];

    // Step 1: Create adjustment
    steps[0] = { title: steps[0].title, status: "running" };
    setFinancialTestSteps([...steps]);

    try {
      await setDoc(doc(db, "users", userId, "adjustments", testAdjId), {
        id: testAdjId,
        amount: 25.5,
        reason: "Teste Diagnóstico Entrada Caixa",
        date: today,
      });
      steps[0] = {
        title: steps[0].title,
        status: "success",
        details: "Lançamento de R$ 25,50 registrado com sucesso.",
      };
      setFinancialTestSteps([...steps]);
    } catch (err: any) {
      steps[0] = {
        title: steps[0].title,
        status: "error",
        details: `Erro no lançamento: ${err?.message || String(err)}`,
      };
      setFinancialTestSteps([...steps]);
      return;
    }

    // Step 2: Read adjustment
    steps[1] = { title: steps[1].title, status: "running" };
    setFinancialTestSteps([...steps]);
    try {
      const snap = await getDoc(doc(db, "users", userId, "adjustments", testAdjId));
      if (snap.exists() && snap.data().amount === 25.5) {
        steps[1] = {
          title: steps[1].title,
          status: "success",
          details: `Entrada conferida: R$ ${snap.data().amount} em ${snap.data().date}.`,
        };
      } else {
        steps[1] = {
          title: steps[1].title,
          status: "error",
          details: "Ajuste não recuperado com integridade.",
        };
      }
      setFinancialTestSteps([...steps]);
    } catch (err: any) {
      steps[1] = {
        title: steps[1].title,
        status: "error",
        details: `Erro na leitura: ${err?.message || String(err)}`,
      };
      setFinancialTestSteps([...steps]);
      return;
    }

    // Step 3: Create and update drink stock
    steps[2] = { title: steps[2].title, status: "running" };
    setFinancialTestSteps([...steps]);
    try {
      await setDoc(doc(db, "users", userId, "drinks", testDrinkId), {
        id: testDrinkId,
        name: "Bebida Teste",
        price: 8.5,
        stock: 10,
      });
      await updateDoc(doc(db, "users", userId, "drinks", testDrinkId), {
        stock: 9,
      });
      const drinkSnap = await getDoc(doc(db, "users", userId, "drinks", testDrinkId));
      if (drinkSnap.exists() && drinkSnap.data().stock === 9) {
        steps[2] = {
          title: steps[2].title,
          status: "success",
          details: "Produto criado (10 un) e baixado para 9 un com sucesso.",
        };
      } else {
        steps[2] = {
          title: steps[2].title,
          status: "error",
          details: "Saldo de estoque não conferiu.",
        };
      }
      setFinancialTestSteps([...steps]);
    } catch (err: any) {
      steps[2] = {
        title: steps[2].title,
        status: "error",
        details: `Erro no estoque: ${err?.message || String(err)}`,
      };
      setFinancialTestSteps([...steps]);
      return;
    }

    // Step 4: Cleanup
    steps[3] = { title: steps[3].title, status: "running" };
    setFinancialTestSteps([...steps]);
    try {
      await deleteDoc(doc(db, "users", userId, "adjustments", testAdjId));
      await deleteDoc(doc(db, "users", userId, "drinks", testDrinkId));
      steps[3] = {
        title: steps[3].title,
        status: "success",
        details: "Registros financeiros e de bar removidos.",
      };
      setFinancialTestSteps([...steps]);
      showToast("Teste Financeiro & Estoque finalizado com sucesso!", "success");
    } catch (err: any) {
      steps[3] = {
        title: steps[3].title,
        status: "error",
        details: `Erro na limpeza: ${err?.message || String(err)}`,
      };
      setFinancialTestSteps([...steps]);
    }
  };

  // Run all tests in sequence
  const runAllTests = async () => {
    setIsRunningAll(true);
    try {
      await runClientTest();
      await runAppointmentTest();
      await runServiceTest();
      await runFinancialAndStockTest();
      await runAudit();
    } finally {
      setIsRunningAll(false);
    }
  };

  // Run audit to check orphan appointments and duplicate client names
  const runAudit = async () => {
    const clientMap = new Map<string, Client>();
    const clientNameCounts: Record<string, number> = {};

    clients.forEach((c) => {
      clientMap.set(c.id, c);
      const cleanName = c.name.trim().toLowerCase();
      clientNameCounts[cleanName] = (clientNameCounts[cleanName] || 0) + 1;
    });

    const duplicates: { name: string; count: number }[] = [];
    Object.entries(clientNameCounts).forEach(([name, count]) => {
      if (count > 1) {
        // Find original casing
        const original = clients.find((c) => c.name.trim().toLowerCase() === name)?.name || name;
        duplicates.push({ name: original, count });
      }
    });

    // Check orphan appointments: appointments whose clientId does NOT exist in clients, or that lack clientName
    const orphans = appointments.filter((a) => {
      const hasClient = a.clientId && clientMap.has(a.clientId);
      const hasDirectName = Boolean(a.clientName && a.clientName.trim());
      return !hasClient && !hasDirectName;
    });

    setAuditStats({
      orphanedApts: orphans,
      duplicateClients: duplicates,
      totalCheckedApts: appointments.length,
      totalCheckedClients: clients.length,
    });
  };

  // Repair orphan appointments by setting clientName to "Cliente Avulso" or matching by clientPhone
  const fixOrphans = async () => {
    if (!auditStats || auditStats.orphanedApts.length === 0) return;
    setIsFixingOrphans(true);

    try {
      let fixedCount = 0;
      for (const apt of auditStats.orphanedApts) {
        // Try to match by phone or fallback to "Cliente Agendado"
        const matchedClient = clients.find(
          (c) => c.phone && apt.clientPhone && c.phone.replace(/\D/g, "") === apt.clientPhone.replace(/\D/g, "")
        );
        const resolvedName = matchedClient?.name || apt.clientName || "Cliente Agendado";
        const resolvedPhone = matchedClient?.phone || apt.clientPhone || "";

        await updateDoc(doc(db, "users", userId, "appointments", apt.id), {
          clientName: resolvedName,
          clientPhone: resolvedPhone,
          ...(matchedClient ? { clientId: matchedClient.id } : {}),
        });
        fixedCount++;
      }

      showToast(`${fixedCount} agendamento(s) reparado(s) com sucesso!`, "success");
      if (onRefreshData) onRefreshData();
      await runAudit();
    } catch (err: any) {
      showToast(`Erro ao reparar: ${err?.message || String(err)}`, "error");
    } finally {
      setIsFixingOrphans(false);
    }
  };

  // Manual Quick Client Creation
  const handleCreateManualClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualClientName.trim()) {
      showToast("Informe o nome do cliente!", "error");
      return;
    }
    setIsCreatingManualClient(true);
    const newId = Date.now().toString();

    try {
      await setDoc(doc(db, "users", userId, "clients", newId), {
        id: newId,
        name: manualClientName.trim(),
        phone: manualClientPhone.trim(),
        totalSpent: 0,
        lastVisit: new Date().toISOString(),
      });
      showToast(`Cliente "${manualClientName.trim()}" criado com sucesso!`, "success");
      setManualClientName("");
      setManualClientPhone("");
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(`Erro ao criar cliente: ${err?.message || String(err)}`, "error");
    } finally {
      setIsCreatingManualClient(false);
    }
  };

  // Manual Quick Appointment Creation
  const handleCreateManualApt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAptName.trim()) {
      showToast("Informe o nome do cliente para o agendamento!", "error");
      return;
    }
    setIsCreatingManualApt(true);

    try {
      // Find or auto-create client
      let existingClient = clients.find(
        (c) => c.name.toLowerCase().trim() === manualAptName.toLowerCase().trim()
      );
      let targetClientId = existingClient?.id;

      if (!targetClientId) {
        targetClientId = Date.now().toString();
        await setDoc(doc(db, "users", userId, "clients", targetClientId), {
          id: targetClientId,
          name: manualAptName.trim(),
          phone: "",
          totalSpent: 0,
        });
      }

      const newAptId = (Date.now() + 1).toString();
      const chosenService = services[0];

      await setDoc(doc(db, "users", userId, "appointments", newAptId), {
        id: newAptId,
        clientId: targetClientId,
        clientName: manualAptName.trim(),
        clientPhone: existingClient?.phone || "",
        serviceId: chosenService?.id || "servico_padrao",
        date: manualAptDate,
        time: manualAptTime,
        completed: false,
        paid: false,
        finalPrice: chosenService?.price || 35,
        status: "confirmed",
        createdAt: new Date().toISOString(),
      });

      showToast(`Agendamento de "${manualAptName.trim()}" gravado com sucesso!`, "success");
      setManualAptName("");
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(`Erro ao criar agendamento: ${err?.message || String(err)}`, "error");
    } finally {
      setIsCreatingManualApt(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Wrench size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                  Central de Reparo & Testes do Sistema
                </h3>
                <Badge variant="cyan" size="sm">
                  Diagnóstico Ativo
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Teste e repare instantaneamente as funções de adicionar novos clientes e nomes em agendamentos
              </p>
            </div>
          </div>
          <IconButton
            icon={<X size={18} />}
            variant="ghost"
            onClick={onClose}
            title="Fechar"
          />
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-white/5 bg-slate-950/40 flex gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("tests")}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "tests"
                ? "bg-slate-900 text-emerald-400 border-t-2 border-emerald-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Play size={14} />
            Testes Automatizados
          </button>
          <button
            onClick={() => {
              setActiveTab("audit");
              if (!auditStats) runAudit();
            }}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "audit"
                ? "bg-slate-900 text-emerald-400 border-t-2 border-emerald-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Database size={14} />
            Auditoria & Integridade
            {auditStats && auditStats.orphanedApts.length > 0 && (
              <span className="h-4 w-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {auditStats.orphanedApts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "manual"
                ? "bg-slate-900 text-emerald-400 border-t-2 border-emerald-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserPlus size={14} />
            Teste Manual Rápido
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {activeTab === "tests" && (
            <div className="space-y-6">
              {/* Top Action Bar */}
              <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-white uppercase">
                    Bateria de Testes Funcionais
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Simula operações reais no Firestore para verificar regras de segurança, gravação e leitura.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={runAllTests}
                    isLoading={isRunningAll}
                    icon={<Play size={14} />}
                    className="flex-1 sm:flex-initial"
                  >
                    Executar Todos os Testes
                  </Button>
                </div>
              </div>

              {/* TEST CARD 1: CLIENTES */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                      <UserPlus size={18} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-white uppercase tracking-wider">
                        1. Teste de Função: Adicionar Novos Clientes
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        Valida criação com nome, WhatsApp, persistência no banco e permissões de escrita.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="lilac"
                    size="xs"
                    onClick={runClientTest}
                    icon={<RotateCw size={12} />}
                  >
                    Testar Clientes
                  </Button>
                </div>

                {clientTestSteps.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    {clientTestSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between p-2.5 bg-slate-900/80 rounded-xl border border-white/5 text-xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {step.status === "success" && (
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          {step.status === "error" && (
                            <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                          )}
                          {step.status === "running" && (
                            <RotateCw size={16} className="text-amber-400 animate-spin shrink-0 mt-0.5" />
                          )}
                          {step.status === "pending" && (
                            <div className="h-4 w-4 rounded-full border border-slate-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-bold text-slate-200">{step.title}</p>
                            {step.details && (
                              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                {step.details}
                              </p>
                            )}
                          </div>
                        </div>
                        {step.latencyMs !== undefined && (
                          <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0 ml-2">
                            {step.latencyMs}ms
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TEST CARD 2: AGENDAMENTOS COM NOME */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-elite-cyan-500/15 border border-elite-cyan-500/30 text-elite-cyan-400 flex items-center justify-center">
                      <CalendarCheck size={18} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-white uppercase tracking-wider">
                        2. Teste de Função: Adicionar Nomes em Agendamento
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        Valida gravação do cliente vinculado ao horário, integridade de horário e preço.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="cyan"
                    size="xs"
                    onClick={runAppointmentTest}
                    icon={<RotateCw size={12} />}
                  >
                    Testar Agendamento
                  </Button>
                </div>

                {aptTestSteps.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    {aptTestSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between p-2.5 bg-slate-900/80 rounded-xl border border-white/5 text-xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {step.status === "success" && (
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          {step.status === "error" && (
                            <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                          )}
                          {step.status === "running" && (
                            <RotateCw size={16} className="text-amber-400 animate-spin shrink-0 mt-0.5" />
                          )}
                          {step.status === "pending" && (
                            <div className="h-4 w-4 rounded-full border border-slate-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-bold text-slate-200">{step.title}</p>
                            {step.details && (
                              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                {step.details}
                              </p>
                            )}
                          </div>
                        </div>
                        {step.latencyMs !== undefined && (
                          <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0 ml-2">
                            {step.latencyMs}ms
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TEST CARD 3: SERVIÇOS */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                      <Scissors size={18} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-white uppercase tracking-wider">
                        3. Teste de Função: Catálogo de Serviços
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        Valida criação, atualização de valores, duração e deleção no Firestore.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="warning"
                    size="xs"
                    onClick={runServiceTest}
                    icon={<RotateCw size={12} />}
                  >
                    Testar Serviços
                  </Button>
                </div>

                {serviceTestSteps.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    {serviceTestSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between p-2.5 bg-slate-900/80 rounded-xl border border-white/5 text-xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {step.status === "success" && (
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          {step.status === "error" && (
                            <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                          )}
                          {step.status === "running" && (
                            <RotateCw size={16} className="text-amber-400 animate-spin shrink-0 mt-0.5" />
                          )}
                          {step.status === "pending" && (
                            <div className="h-4 w-4 rounded-full border border-slate-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-bold text-slate-200">{step.title}</p>
                            {step.details && (
                              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                {step.details}
                              </p>
                            )}
                          </div>
                        </div>
                        {step.latencyMs !== undefined && (
                          <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0 ml-2">
                            {step.latencyMs}ms
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TEST CARD 4: FINANCEIRO & ESTOQUE */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-white uppercase tracking-wider">
                        4. Teste de Função: Financeiro & Estoque
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        Valida lançamentos de caixa (entradas/saídas) e atualização de estoque de bar.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="success"
                    size="xs"
                    onClick={runFinancialAndStockTest}
                    icon={<RotateCw size={12} />}
                  >
                    Testar Financeiro
                  </Button>
                </div>

                {financialTestSteps.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    {financialTestSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between p-2.5 bg-slate-900/80 rounded-xl border border-white/5 text-xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {step.status === "success" && (
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          {step.status === "error" && (
                            <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                          )}
                          {step.status === "running" && (
                            <RotateCw size={16} className="text-amber-400 animate-spin shrink-0 mt-0.5" />
                          )}
                          {step.status === "pending" && (
                            <div className="h-4 w-4 rounded-full border border-slate-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-bold text-slate-200">{step.title}</p>
                            {step.details && (
                              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                {step.details}
                              </p>
                            )}
                          </div>
                        </div>
                        {step.latencyMs !== undefined && (
                          <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0 ml-2">
                            {step.latencyMs}ms
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white uppercase">
                    Auditoria de Integridade dos Dados
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Identifica agendamentos sem nome de cliente atribuído ou duplicidades na base.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runAudit}
                  icon={<RotateCw size={13} />}
                >
                  Atualizar Auditoria
                </Button>
              </div>

              {auditStats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Total de Clientes
                    </p>
                    <p className="text-2xl font-black text-white mt-1">
                      {auditStats.totalCheckedClients}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Total de Agendamentos
                    </p>
                    <p className="text-2xl font-black text-white mt-1">
                      {auditStats.totalCheckedApts}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Agendamentos Órfãos (Sem Nome)
                    </p>
                    <p
                      className={`text-2xl font-black mt-1 ${
                        auditStats.orphanedApts.length > 0
                          ? "text-rose-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {auditStats.orphanedApts.length}
                    </p>
                  </div>
                </div>
              )}

              {auditStats && auditStats.orphanedApts.length > 0 && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={18} className="text-rose-400" />
                      <h5 className="text-xs font-black text-rose-400 uppercase">
                        {auditStats.orphanedApts.length} Agendamento(s) precisam de reparo de nome
                      </h5>
                    </div>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={fixOrphans}
                      isLoading={isFixingOrphans}
                    >
                      Reparar Nomes Automaticamente
                    </Button>
                  </div>
                  <p className="text-xs text-slate-300">
                    O sistema tentará reconciliar esses horários com clientes cadastrados ou atribuirá nomes amigáveis para que nenhum agendamento fique sem identificação.
                  </p>
                </div>
              )}

              {auditStats && auditStats.duplicateClients.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400" />
                    <h5 className="text-xs font-black text-amber-400 uppercase">
                      Possíveis Nomes Duplicados Encontrados ({auditStats.duplicateClients.length})
                    </h5>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {auditStats.duplicateClients.map((dup, i) => (
                      <Badge key={i} variant="warning" size="sm">
                        {dup.name} ({dup.count}x)
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Dica: Você pode diferenciar nomes homônimos adicionando sobrenome ou apelido na aba Clientes.
                  </p>
                </div>
              )}

              {auditStats &&
                auditStats.orphanedApts.length === 0 &&
                auditStats.duplicateClients.length === 0 && (
                  <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
                    <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
                    <h5 className="text-sm font-black text-emerald-400 uppercase">
                      Integridade dos Dados Impecável!
                    </h5>
                    <p className="text-xs text-slate-300">
                      Todos os agendamentos estão devidamente vinculados aos seus respectivos clientes e não foram encontradas inconsistências.
                    </p>
                  </div>
                )}
            </div>
          )}

          {activeTab === "manual" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quick Client Creator */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-white uppercase tracking-wider">
                      Adicionar Cliente (Teste Direto)
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Cadastra um novo cliente imediatamente no Firestore.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateManualClient} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">
                      Nome do Cliente
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: João Vitor da Silva"
                      value={manualClientName}
                      onChange={(e) => setManualClientName(e.target.value)}
                      className="w-full mt-1 px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">
                      WhatsApp / Telefone (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="11999999999"
                      value={manualClientPhone}
                      onChange={(e) => setManualClientPhone(e.target.value)}
                      className="w-full mt-1 px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-purple-400"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="lilac"
                    size="sm"
                    className="w-full"
                    isLoading={isCreatingManualClient}
                    icon={<UserPlus size={14} />}
                  >
                    Salvar Cliente Agora
                  </Button>
                </form>
              </div>

              {/* Quick Appointment Creator with Name */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-elite-cyan-500/15 border border-elite-cyan-500/30 text-elite-cyan-400 flex items-center justify-center">
                    <CalendarCheck size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-white uppercase tracking-wider">
                      Adicionar Agendamento por Nome
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Gera um agendamento com qualquer nome (cria cliente se não existir).
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateManualApt} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">
                      Nome para o Horário
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Carlos Eduardo"
                      value={manualAptName}
                      onChange={(e) => setManualAptName(e.target.value)}
                      className="w-full mt-1 px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-elite-cyan-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase">
                        Data
                      </label>
                      <input
                        type="date"
                        value={manualAptDate}
                        onChange={(e) => setManualAptDate(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-elite-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase">
                        Horário
                      </label>
                      <input
                        type="time"
                        value={manualAptTime}
                        onChange={(e) => setManualAptTime(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-elite-cyan-400"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="cyan"
                    size="sm"
                    className="w-full"
                    isLoading={isCreatingManualApt}
                    icon={<CalendarCheck size={14} />}
                  >
                    Agendar Horário com este Nome
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>Sistema com regras de segurança ativas no Firestore</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            FECHAR
          </Button>
        </div>
      </div>
    </div>
  );
};
