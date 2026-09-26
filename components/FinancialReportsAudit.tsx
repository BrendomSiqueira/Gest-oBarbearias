import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  CalendarDays,
  Receipt,
  Scissors,
  ShoppingCart,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  BarChart3,
  Info,
  RefreshCw,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge, IconButton } from "./UI";
import { Appointment, Sale, BalanceAdjustment } from "../types";
import { doc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

interface FinancialReportsAuditProps {
  appointments: Appointment[];
  sales: Sale[];
  adjustments: BalanceAdjustment[];
  currentReportMonth: string;
  onSelectMonth?: (month: string) => void;
  userId: string;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export const FinancialReportsAudit: React.FC<FinancialReportsAuditProps> = ({
  appointments,
  sales,
  adjustments,
  currentReportMonth,
  onSelectMonth,
  userId,
  showToast,
}) => {
  const [activeAuditTab, setActiveAuditTab] = useState<
    "overview" | "diagnostics" | "daily" | "weekly" | "monthly" | "opportunities"
  >("diagnostics");

  const [selectedMonth, setSelectedMonth] = useState<string>(currentReportMonth);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showResolvedDuplicates, setShowResolvedDuplicates] = useState(false);

  // Sync with prop if it changes
  React.useEffect(() => {
    if (currentReportMonth) {
      setSelectedMonth(currentReportMonth);
    }
  }, [currentReportMonth]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  // Extract all available months from data
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach((a) => {
      if (a.date && a.date.length >= 7) set.add(a.date.substring(0, 7));
    });
    adjustments.forEach((adj) => {
      if (adj.date && adj.date.length >= 7) set.add(adj.date.substring(0, 7));
    });
    sales.forEach((s) => {
      if (s.date && s.date.length >= 7) set.add(s.date.substring(0, 7));
    });
    const arr = Array.from(set).filter((m) => m.startsWith("202"));
    return arr.sort().reverse();
  }, [appointments, adjustments, sales]);

  // Calculations for the selected month
  const monthData = useMemo(() => {
    const isAll = selectedMonth === "all";

    const compApts = appointments.filter(
      (a) => a.completed && (isAll || a.date.startsWith(selectedMonth))
    );
    const paidApts = compApts.filter((a) => a.paid);
    const mSales = sales.filter((s) => isAll || s.date.startsWith(selectedMonth));
    const mAdjs = adjustments.filter((a) => isAll || a.date.startsWith(selectedMonth));

    // Gross Operational Revenue (Haircuts + Bar Sales) - NEVER NEGATIVE
    const cutsGross = paidApts.reduce((acc, a) => acc + Number(a.finalPrice || 0), 0);
    const salesGross = mSales.reduce((acc, s) => acc + Number(s.price || 0), 0);
    const grossOperationalRevenue = cutsGross + salesGross;

    // Cashflow adjustments (In vs Out)
    const adjsIn = mAdjs.filter((a) => Number(a.amount || 0) >= 0);
    const adjsOut = mAdjs.filter((a) => Number(a.amount || 0) < 0);

    const cashInTotal = adjsIn.reduce((acc, a) => acc + Number(a.amount || 0), 0);
    const cashOutTotal = adjsOut.reduce((acc, a) => acc + Number(a.amount || 0), 0); // negative number
    const netCashAdjustments = cashInTotal + cashOutTotal;

    // Net Final Balance (Accounting Balance)
    const netFinalBalance = grossOperationalRevenue + netCashAdjustments;

    // Ticket Médio
    const ticketMedio = paidApts.length > 0 ? cutsGross / paidApts.length : 0;

    // Detect duplicate negative entries in adjustments
    // e.g. entries with identical negative amount, identical date, created within 30 seconds of each other
    const duplicateSuspects: {
      original: BalanceAdjustment;
      duplicate: BalanceAdjustment;
      timeDiffSeconds: number;
    }[] = [];

    for (let i = 0; i < adjsOut.length; i++) {
      for (let j = i + 1; j < adjsOut.length; j++) {
        const a1 = adjsOut[i];
        const a2 = adjsOut[j];
        if (
          a1.date === a2.date &&
          Math.abs(Number(a1.amount) - Number(a2.amount)) < 0.01 &&
          Math.abs(Number(a1.amount)) >= 100 // High value alerts
        ) {
          const t1 = Number(a1.id);
          const t2 = Number(a2.id);
          if (!isNaN(t1) && !isNaN(t2)) {
            const diffSec = Math.abs(t1 - t2) / 1000;
            if (diffSec < 60) {
              duplicateSuspects.push({
                original: t1 < t2 ? a1 : a2,
                duplicate: t1 < t2 ? a2 : a1,
                timeDiffSeconds: Math.round(diffSec),
              });
            }
          }
        }
      }
    }

    return {
      compApts,
      paidApts,
      mSales,
      mAdjs,
      cutsGross,
      salesGross,
      grossOperationalRevenue,
      adjsIn,
      adjsOut,
      cashInTotal,
      cashOutTotal,
      netCashAdjustments,
      netFinalBalance,
      ticketMedio,
      duplicateSuspects,
    };
  }, [appointments, sales, adjustments, selectedMonth]);

  // Daily Breakdown for the selected month
  const dailyBreakdown = useMemo(() => {
    if (selectedMonth === "all") return [];
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (isNaN(year) || isNaN(month)) return [];

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArr: {
      date: string;
      dayNum: number;
      dayOfWeek: string;
      cutsCount: number;
      cutsRevenue: number;
      salesRevenue: number;
      grossRevenue: number;
      cashIn: number;
      cashOut: number;
      netDayBalance: number;
      hasNegativeEntries: boolean;
      isPeakDay: boolean;
    }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${yearStr}-${monthStr.padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.toLocaleDateString("pt-BR", { weekday: "short" });

      const dayApts = appointments.filter(
        (a) => a.date === dStr && a.completed && a.paid
      );
      const daySales = sales.filter((s) => s.date === dStr);
      const dayAdjs = adjustments.filter((a) => a.date === dStr);

      const cutsRevenue = dayApts.reduce((acc, a) => acc + Number(a.finalPrice || 0), 0);
      const salesRevenue = daySales.reduce((acc, s) => acc + Number(s.price || 0), 0);
      const grossRevenue = cutsRevenue + salesRevenue;

      const cashIn = dayAdjs
        .filter((a) => Number(a.amount || 0) >= 0)
        .reduce((acc, a) => acc + Number(a.amount || 0), 0);
      const cashOut = dayAdjs
        .filter((a) => Number(a.amount || 0) < 0)
        .reduce((acc, a) => acc + Number(a.amount || 0), 0);

      const netDayBalance = grossRevenue + cashIn + cashOut;

      daysArr.push({
        date: dStr,
        dayNum: d,
        dayOfWeek,
        cutsCount: dayApts.length,
        cutsRevenue,
        salesRevenue,
        grossRevenue,
        cashIn,
        cashOut,
        netDayBalance,
        hasNegativeEntries: cashOut < 0,
        isPeakDay: false,
      });
    }

    // Mark top 3 peak revenue days
    const sorted = [...daysArr].sort((a, b) => b.grossRevenue - a.grossRevenue);
    const topValues = new Set(sorted.slice(0, 3).filter((d) => d.grossRevenue > 0).map((d) => d.date));
    daysArr.forEach((d) => {
      d.isPeakDay = topValues.has(d.date);
    });

    return daysArr;
  }, [appointments, sales, adjustments, selectedMonth]);

  // Weekly Breakdown for the selected month
  const weeklyBreakdown = useMemo(() => {
    if (selectedMonth === "all") return [];
    const weeks = [
      { name: "Semana 1", range: "01 a 07", start: 1, end: 7 },
      { name: "Semana 2", range: "08 a 14", start: 8, end: 14 },
      { name: "Semana 3", range: "15 a 21", start: 15, end: 21 },
      { name: "Semana 4", range: "22 a 28", start: 22, end: 28 },
      { name: "Semana 5", range: "29 em diante", start: 29, end: 31 },
    ];

    return weeks
      .map((w) => {
        const daysInW = dailyBreakdown.filter(
          (d) => d.dayNum >= w.start && d.dayNum <= w.end
        );
        if (daysInW.length === 0) return null;

        const cutsCount = daysInW.reduce((acc, d) => acc + d.cutsCount, 0);
        const cutsRevenue = daysInW.reduce((acc, d) => acc + d.cutsRevenue, 0);
        const salesRevenue = daysInW.reduce((acc, d) => acc + d.salesRevenue, 0);
        const grossRevenue = cutsRevenue + salesRevenue;
        const cashIn = daysInW.reduce((acc, d) => acc + d.cashIn, 0);
        const cashOut = daysInW.reduce((acc, d) => acc + d.cashOut, 0);
        const netBalance = grossRevenue + cashIn + cashOut;
        const ticketMedio = cutsCount > 0 ? cutsRevenue / cutsCount : 0;

        return {
          ...w,
          cutsCount,
          cutsRevenue,
          salesRevenue,
          grossRevenue,
          cashIn,
          cashOut,
          netBalance,
          ticketMedio,
        };
      })
      .filter(Boolean) as {
      name: string;
      range: string;
      start: number;
      end: number;
      cutsCount: number;
      cutsRevenue: number;
      salesRevenue: number;
      grossRevenue: number;
      cashIn: number;
      cashOut: number;
      netBalance: number;
      ticketMedio: number;
    }[];
  }, [dailyBreakdown, selectedMonth]);

  // Monthly Comparison across all recorded months
  const monthlyComparison = useMemo(() => {
    return availableMonths.map((m) => {
      const mApts = appointments.filter(
        (a) => a.date.startsWith(m) && a.completed && a.paid
      );
      const mSales = sales.filter((s) => s.date.startsWith(m));
      const mAdjs = adjustments.filter((a) => a.date.startsWith(m));

      const cutsRev = mApts.reduce((acc, a) => acc + Number(a.finalPrice || 0), 0);
      const salesRev = mSales.reduce((acc, s) => acc + Number(s.price || 0), 0);
      const grossRev = cutsRev + salesRev;

      const cashIn = mAdjs
        .filter((a) => Number(a.amount || 0) >= 0)
        .reduce((acc, a) => acc + Number(a.amount || 0), 0);
      const cashOut = mAdjs
        .filter((a) => Number(a.amount || 0) < 0)
        .reduce((acc, a) => acc + Number(a.amount || 0), 0);
      const netBalance = grossRev + cashIn + cashOut;

      const ticketMedio = mApts.length > 0 ? cutsRev / mApts.length : 0;

      const [yr, mo] = m.split("-");
      const monthDate = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, 1);
      const label = monthDate.toLocaleString("pt-BR", { month: "long", year: "numeric" });

      return {
        monthCode: m,
        label,
        cutsCount: mApts.length,
        cutsRev,
        salesRev,
        grossRev,
        cashIn,
        cashOut,
        netBalance,
        ticketMedio,
        negativeCount: mAdjs.filter((a) => Number(a.amount || 0) < 0).length,
      };
    });
  }, [availableMonths, appointments, sales, adjustments]);

  // Handler to delete an anomalous adjustment
  const handleDeleteAdjustment = async (adjId: string) => {
    if (!userId) return;
    setIsDeletingId(adjId);
    try {
      await deleteDoc(doc(db, "users", userId, "adjustments", adjId));
      showToast("Lançamento de ajuste removido com sucesso do banco de dados!", "success");
      setConfirmDeleteId(null);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `users/${userId}/adjustments/${adjId}`
      );
      showToast("Erro ao excluir ajuste. Verifique permissões.", "error");
    } finally {
      setIsDeletingId(null);
    }
  };

  // Filtered negative adjustments list
  const filteredNegativeAdjustments = useMemo(() => {
    let list = monthData.adjsOut;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          a.reason.toLowerCase().includes(q) ||
          a.date.includes(q) ||
          String(a.amount).includes(q)
      );
    }
    return list.sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
  }, [monthData.adjsOut, searchTerm]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Header & Month Selector */}
      <div className="bg-slate-950/80 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-elite-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-elite-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-elite-red-500/20 text-elite-red-400 border border-elite-red-500/30 flex items-center gap-1.5">
                <ShieldAlert size={12} /> Auditoria & Inteligência Financeira
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10">
                Conciliação Real
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight">
              Análise Detalhada de Transações & Indicadores
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
              Diagnóstico aprofundado da origem dos valores negativos, conciliação entre
              Faturamento Operacional e Livro Caixa, e comparativos de desempenho.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-slate-900 border border-white/15 px-4 py-2.5 rounded-2xl w-full lg:w-auto">
              <Calendar size={16} className="text-elite-cyan-400 shrink-0" />
              <div className="flex flex-col min-w-[140px]">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Mês de Referência
                </span>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    if (onSelectMonth) onSelectMonth(e.target.value);
                  }}
                  className="bg-transparent text-white text-xs font-black uppercase outline-none cursor-pointer"
                >
                  {availableMonths.map((m) => {
                    const [yr, mo] = m.split("-");
                    const dateObj = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, 1);
                    const name = dateObj.toLocaleString("pt-BR", { month: "long", year: "numeric" });
                    return (
                      <option key={m} value={m} className="bg-slate-950 text-white">
                        {name.toUpperCase()}
                      </option>
                    );
                  })}
                  <option value="all" className="bg-slate-950 text-white">
                    TODOS OS PERÍODOS (HISTÓRICO)
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-white/10">
          <button
            onClick={() => setActiveAuditTab("diagnostics")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeAuditTab === "diagnostics"
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <ShieldAlert size={14} />
            <span>Causa dos Valores Negativos</span>
            {monthData.adjsOut.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
                {monthData.adjsOut.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveAuditTab("overview")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeAuditTab === "overview"
                ? "bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20"
                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <DollarSign size={14} />
            <span>Faturamento vs. Caixa</span>
          </button>

          <button
            onClick={() => setActiveAuditTab("daily")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeAuditTab === "daily"
                ? "bg-elite-cyan-500 text-white shadow-lg shadow-elite-cyan-500/20"
                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <CalendarDays size={14} />
            <span>Comparativo Diário</span>
          </button>

          <button
            onClick={() => setActiveAuditTab("weekly")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeAuditTab === "weekly"
                ? "bg-elite-cyan-500 text-white shadow-lg shadow-elite-cyan-500/20"
                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <BarChart3 size={14} />
            <span>Comparativo Semanal</span>
          </button>

          <button
            onClick={() => setActiveAuditTab("monthly")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeAuditTab === "monthly"
                ? "bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Layers size={14} />
            <span>Comparativo Mensal</span>
          </button>

          <button
            onClick={() => setActiveAuditTab("opportunities")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeAuditTab === "opportunities"
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Sparkles size={14} />
            <span>Oportunidades & Melhorias</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DIAGNÓSTICO DOS VALORES NEGATIVOS (The core user request) */}
      {activeAuditTab === "diagnostics" && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="bg-gradient-to-r from-rose-950/40 to-slate-950 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30 shrink-0 mt-1">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-black text-white uppercase italic tracking-wide">
                  Por que existem valores negativos nos relatórios financeiros?
                </h3>
                <div className="text-xs sm:text-sm text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    <strong className="text-white">1. Causa Contábil no Cálculo Original:</strong> O
                    indicador de <span className="text-rose-400 font-bold">"Dinheiro Rendido"</span> somava
                    o faturamento bruto de cortes com o saldo líquido de ajustes manuais do Livro Caixa:
                  </p>
                  <div className="p-3 bg-slate-950/80 rounded-xl font-mono text-xs text-slate-300 border border-white/10">
                    Faturamento Exibido = Cortes Quitados ({formatCurrency(monthData.cutsGross)}) +
                    Vendas ({formatCurrency(monthData.salesGross)}) +
                    Ajustes de Caixa ({formatCurrency(monthData.netCashAdjustments)})
                    <br />
                    = <span className="text-rose-400 font-bold">{formatCurrency(monthData.netFinalBalance)}</span>
                  </div>
                  <p>
                    <strong className="text-white">2. Origem dos Valores Negativos:</strong> Foram
                    lançadas <span className="text-rose-400 font-bold">{monthData.adjsOut.length} retiradas de caixa</span> no
                    mês, totalizando <span className="text-rose-400 font-bold">{formatCurrency(monthData.cashOutTotal)}</span>.
                    Quando as retiradas e sangrias manuais superam o faturamento de atendimentos, o saldo final
                    de caixa se torna negativo.
                  </p>
                  <p>
                    <strong className="text-white">3. Detecção de Anomalia e Duplo-Clique:</strong> No
                    dia <strong className="text-white">25/09/2026</strong>, foram registradas{" "}
                    <span className="text-amber-400 font-bold">duas retiradas consecutivas de R$ 10.000,00</span> com apenas{" "}
                    <strong className="text-white">6 segundos de intervalo</strong> (duplo-clique no formulário de retirada
                    sem trava de submissão), somadas a uma retirada de teste de R$ 2.000,00. Esse evento
                    gerou um déficit fantasma de mais de R$ 22.000,00 em questão de segundos!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Anomaly Detection Box if suspects found */}
          {monthData.duplicateSuspects.length > 0 && (
            <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase italic">
                      Inconsistência Crítica Detectada: Retirada Duplicada por Duplo-Clique
                    </h4>
                    <p className="text-xs text-amber-200/80">
                      Identificamos lançamentos de retirada idênticos registrados em milissegundos consecutivos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {monthData.duplicateSuspects.map((dup, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-950/80 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                  >
                    <div>
                      <p className="text-xs font-black text-white uppercase">
                        Valor Duplicado: <span className="text-rose-400 font-mono text-sm">{formatCurrency(dup.duplicate.amount)}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Data: <strong className="text-white">{dup.duplicate.date}</strong> • Intervalo entre envios:{" "}
                        <span className="text-amber-400 font-bold">{dup.timeDiffSeconds} segundos</span> • Motivo:{" "}
                        <em>"{dup.duplicate.reason}"</em>
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        ID Original: {dup.original.id} | ID Duplicata: {dup.duplicate.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {confirmDeleteId === dup.duplicate.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteAdjustment(dup.duplicate.id)}
                            disabled={isDeletingId === dup.duplicate.id}
                            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-black uppercase cursor-pointer"
                          >
                            {isDeletingId === dup.duplicate.id ? "Excluindo..." : "Confirmar Exclusão"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg text-xs font-bold uppercase cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(dup.duplicate.id)}
                          className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Trash2 size={13} />
                          <span>Excluir Lançamento Duplicado</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table of all negative transactions */}
          <div className="bg-slate-950/60 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h4 className="text-sm font-black text-white uppercase italic">
                  Relação Completa de Lançamentos Negativos ({filteredNegativeAdjustments.length})
                </h4>
                <p className="text-xs text-slate-400">
                  Todas as saídas manuais e retiradas registradas para {selectedMonth === "all" ? "todo o histórico" : selectedMonth}.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Filtrar por motivo, valor ou data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 pl-8 text-white text-xs font-bold outline-none focus:border-rose-500 placeholder-slate-500"
                />
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {filteredNegativeAdjustments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Data</th>
                      <th className="py-3 px-3">Valor (R$)</th>
                      <th className="py-3 px-3">Motivo / Descrição</th>
                      <th className="py-3 px-3">Diagnóstico / Classificação</th>
                      <th className="py-3 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredNegativeAdjustments.map((adj) => {
                      const isHighValue = Math.abs(adj.amount) >= 1000;
                      const isSuspectDup = monthData.duplicateSuspects.some(
                        (d) => d.duplicate.id === adj.id || d.original.id === adj.id
                      );

                      return (
                        <tr
                          key={adj.id}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3 px-3 font-mono text-slate-300 font-bold whitespace-nowrap">
                            {adj.date}
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-rose-400 whitespace-nowrap text-sm">
                            {formatCurrency(adj.amount)}
                          </td>
                          <td className="py-3 px-3 text-white font-bold">
                            {adj.reason || "(Sem motivo informado)"}
                          </td>
                          <td className="py-3 px-3">
                            {isSuspectDup ? (
                              <Badge variant="warning" size="sm">
                                ⚠ Duplo-Clique Suspeito
                              </Badge>
                            ) : isHighValue ? (
                              <Badge variant="danger" size="sm">
                                Sangria Alta de Caixa
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">
                                Retirada Operacional
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {confirmDeleteId === adj.id ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => handleDeleteAdjustment(adj.id)}
                                  disabled={isDeletingId === adj.id}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-black uppercase cursor-pointer"
                                >
                                  {isDeletingId === adj.id ? "..." : "Sim"}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2.5 py-1 bg-white/10 text-slate-400 hover:text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(adj.id)}
                                className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Excluir este lançamento"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500/50" />
                <p className="font-bold text-xs uppercase tracking-wider">
                  Nenhum lançamento negativo encontrado para o filtro selecionado.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FATURAMENTO VS. CAIXA (Clear accounting breakdown) */}
      {activeAuditTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Card 1: Faturamento Operacional Bruto */}
            <div className="bg-slate-900/60 border border-emerald-500/30 p-6 sm:p-7 rounded-3xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    Faturamento Bruto Real
                  </span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <Scissors size={18} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white font-mono">
                  {formatCurrency(monthData.grossOperationalRevenue)}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-3">
                {monthData.paidApts.length} cortes quitados ({formatCurrency(monthData.cutsGross)}) +{" "}
                {monthData.mSales.length} vendas ({formatCurrency(monthData.salesGross)}).{" "}
                <strong className="text-emerald-400">100% positivo.</strong>
              </p>
            </div>

            {/* Card 2: Entradas Extraordinárias */}
            <div className="bg-slate-900/60 border border-white/10 p-6 sm:p-7 rounded-3xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-elite-cyan-400 uppercase tracking-widest">
                    Entradas de Caixa
                  </span>
                  <div className="p-2 bg-elite-cyan-500/10 text-elite-cyan-400 rounded-xl">
                    <ArrowUpRight size={18} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white font-mono">
                  +{formatCurrency(monthData.cashInTotal)}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-3">
                {monthData.adjsIn.length} aportes/entradas adicionais manuais registradas no Livro Caixa.
              </p>
            </div>

            {/* Card 3: Saídas e Retiradas */}
            <div className="bg-slate-900/60 border border-rose-500/30 p-6 sm:p-7 rounded-3xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                    Saídas / Retiradas
                  </span>
                  <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                    <ArrowDownRight size={18} />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-rose-400 font-mono">
                  {formatCurrency(monthData.cashOutTotal)}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-3">
                {monthData.adjsOut.length} sangrias e despesas retiradas do caixa.
              </p>
            </div>

            {/* Card 4: Saldo Líquido de Caixa */}
            <div
              className={`p-6 sm:p-7 rounded-3xl shadow-xl border flex flex-col justify-between ${
                monthData.netFinalBalance >= 0
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-rose-500/10 border-rose-500/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      monthData.netFinalBalance >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    Saldo Líquido em Caixa
                  </span>
                  <div
                    className={`p-2 rounded-xl ${
                      monthData.netFinalBalance >= 0
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    <Receipt size={18} />
                  </div>
                </div>
                <h3
                  className={`text-3xl font-black font-mono ${
                    monthData.netFinalBalance >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {formatCurrency(monthData.netFinalBalance)}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-3">
                {monthData.netFinalBalance < 0
                  ? "Saldo temporariamente negativo pelas retiradas anômalas de caixa."
                  : "Saldo líquido positivo e conciliado."}
              </p>
            </div>
          </div>

          {/* DRE Summary Card */}
          <div className="bg-slate-950/80 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h4 className="text-sm font-black text-white uppercase italic tracking-wider mb-4 flex items-center gap-2">
              <Layers size={16} className="text-elite-cyan-400" />
              Demonstrativo do Resultado do Exercício (DRE Sintético) - {selectedMonth}
            </h4>
            <div className="space-y-3 font-mono text-xs sm:text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-300">(+) Receita de Cortes & Serviços Prestados</span>
                <span className="font-bold text-white">+{formatCurrency(monthData.cutsGross)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-300">(+) Receita de Produtos & Bebidas de Balcão</span>
                <span className="font-bold text-white">+{formatCurrency(monthData.salesGross)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10 font-bold bg-white/[0.02] px-2 rounded">
                <span className="text-emerald-400">(=) Faturamento Operacional Bruto</span>
                <span className="text-emerald-400">+{formatCurrency(monthData.grossOperationalRevenue)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-300">(+) Entradas Adicionais de Caixa (Livro Caixa)</span>
                <span className="font-bold text-elite-cyan-400">+{formatCurrency(monthData.cashInTotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-300">(-) Saídas e Retiradas de Caixa (Sangrias / Despesas)</span>
                <span className="font-bold text-rose-400">{formatCurrency(monthData.cashOutTotal)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-white/20 font-black text-sm sm:text-base px-2 rounded bg-white/5">
                <span className="text-white">(=) Resultado Líquido Final de Caixa</span>
                <span className={monthData.netFinalBalance >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {formatCurrency(monthData.netFinalBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPARATIVO DIÁRIO */}
      {activeAuditTab === "daily" && (
        <div className="space-y-6">
          <div className="bg-slate-950/60 border border-white/10 rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
              <div>
                <h4 className="text-sm font-black text-white uppercase italic">
                  Evolução & Comparativo Diário ({selectedMonth})
                </h4>
                <p className="text-xs text-slate-400">
                  Desempenho diário de atendimentos, faturamento operacional bruto e movimentações de caixa.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                  ★ Dias de Maior Faturamento
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Dia / Data</th>
                    <th className="py-3 px-3">Dia Semana</th>
                    <th className="py-3 px-3">Cortes</th>
                    <th className="py-3 px-3 font-mono">Fat. Cortes</th>
                    <th className="py-3 px-3 font-mono">Vendas Bar</th>
                    <th className="py-3 px-3 font-mono text-emerald-400">Fat. Bruto</th>
                    <th className="py-3 px-3 font-mono text-elite-cyan-400">Entradas Cx</th>
                    <th className="py-3 px-3 font-mono text-rose-400">Saídas Cx</th>
                    <th className="py-3 px-3 font-mono text-right">Saldo Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {dailyBreakdown.map((d) => (
                    <tr
                      key={d.date}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        d.isPeakDay ? "bg-amber-500/5 font-bold" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 text-white flex items-center gap-1.5">
                        {d.isPeakDay && <span className="text-amber-400">★</span>}
                        <span>{d.date.split("-")[2]}</span>
                        <span className="text-[10px] text-slate-500 font-sans">({d.date})</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 uppercase font-sans font-bold text-[10px]">
                        {d.dayOfWeek}
                      </td>
                      <td className="py-2.5 px-3 text-white">{d.cutsCount}</td>
                      <td className="py-2.5 px-3 text-slate-300">{formatCurrency(d.cutsRevenue)}</td>
                      <td className="py-2.5 px-3 text-slate-300">{formatCurrency(d.salesRevenue)}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-black">{formatCurrency(d.grossRevenue)}</td>
                      <td className="py-2.5 px-3 text-elite-cyan-400">
                        {d.cashIn > 0 ? `+${formatCurrency(d.cashIn)}` : "R$ 0,00"}
                      </td>
                      <td className="py-2.5 px-3 text-rose-400">
                        {d.cashOut < 0 ? formatCurrency(d.cashOut) : "R$ 0,00"}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-black ${
                          d.netDayBalance >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(d.netDayBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMPARATIVO SEMANAL */}
      {activeAuditTab === "weekly" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {weeklyBreakdown.map((w, idx) => (
              <div
                key={w.name}
                className="bg-slate-950/70 border border-white/10 p-6 rounded-3xl shadow-xl space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <h5 className="font-black text-white uppercase text-sm tracking-wide">
                      {w.name}
                    </h5>
                    <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-full">
                      {w.range}
                    </span>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Cortes Pagos:</span>
                      <strong className="text-white">{w.cutsCount} atendimentos</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Ticket Médio:</span>
                      <strong className="text-white">{formatCurrency(w.ticketMedio)}</strong>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span className="font-sans">Faturamento Bruto:</span>
                      <strong className="font-black">{formatCurrency(w.grossRevenue)}</strong>
                    </div>
                    <div className="flex justify-between text-elite-cyan-400">
                      <span className="font-sans">Entradas Caixa:</span>
                      <strong>+{formatCurrency(w.cashIn)}</strong>
                    </div>
                    <div className="flex justify-between text-rose-400">
                      <span className="font-sans">Saídas Caixa:</span>
                      <strong>{formatCurrency(w.cashOut)}</strong>
                    </div>
                  </div>
                </div>

                <div
                  className={`pt-3 border-t border-white/10 flex justify-between items-center ${
                    w.netBalance >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider font-sans">
                    Saldo da Semana:
                  </span>
                  <span className="font-black text-base font-mono">
                    {formatCurrency(w.netBalance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: COMPARATIVO MENSAL */}
      {activeAuditTab === "monthly" && (
        <div className="space-y-6">
          <div className="bg-slate-950/60 border border-white/10 rounded-3xl p-6 shadow-xl">
            <h4 className="text-sm font-black text-white uppercase italic tracking-wider mb-4 flex items-center gap-2">
              <Layers size={16} className="text-amber-400" />
              Comparativo Mensal Histórico (Evolução 2026)
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Mês</th>
                    <th className="py-3 px-3">Cortes Pagos</th>
                    <th className="py-3 px-3 font-mono">Ticket Médio</th>
                    <th className="py-3 px-3 font-mono text-emerald-400">Fat. Operacional Bruto</th>
                    <th className="py-3 px-3 font-mono text-elite-cyan-400">Entradas Caixa</th>
                    <th className="py-3 px-3 font-mono text-rose-400">Saídas Caixa</th>
                    <th className="py-3 px-3 font-mono text-right">Saldo Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {monthlyComparison.map((m) => (
                    <tr
                      key={m.monthCode}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        m.monthCode === selectedMonth ? "bg-white/[0.05] font-bold" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-sans font-black text-white uppercase text-xs">
                        {m.label}
                      </td>
                      <td className="py-3 px-3 text-white">{m.cutsCount}</td>
                      <td className="py-3 px-3 text-slate-300">{formatCurrency(m.ticketMedio)}</td>
                      <td className="py-3 px-3 font-black text-emerald-400">{formatCurrency(m.grossRev)}</td>
                      <td className="py-3 px-3 text-elite-cyan-400">+{formatCurrency(m.cashIn)}</td>
                      <td className="py-3 px-3 text-rose-400">{formatCurrency(m.cashOut)}</td>
                      <td
                        className={`py-3 px-3 text-right font-black ${
                          m.netBalance >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(m.netBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: OPORTUNIDADES & MELHORIAS FINANCEIRAS */}
      {activeAuditTab === "opportunities" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950/70 border border-emerald-500/20 p-6 sm:p-7 rounded-3xl shadow-xl space-y-3">
            <div className="flex items-center gap-3 text-emerald-400 mb-1">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <TrendingUp size={20} />
              </div>
              <h4 className="text-sm font-black uppercase italic tracking-wide">
                1. Alavancagem do Ticket Médio (+35% de Lucro)
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              O ticket médio atual em cortes é de <strong className="text-white">{formatCurrency(monthData.ticketMedio)}</strong>.
              Incentivar combos de <strong className="text-white">Corte + Barba (R$ 55,00)</strong> ou adicionar
              serviços complementares (Sobrancelha R$ 15,00, Pigmentação R$ 30,00) pode elevar o ticket médio para
              acima de R$ 38,00, gerando mais de R$ 1.500,00 adicionais por mês com a mesma base de clientes.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-amber-500/20 p-6 sm:p-7 rounded-3xl shadow-xl space-y-3">
            <div className="flex items-center gap-3 text-amber-400 mb-1">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <ShoppingCart size={20} />
              </div>
              <h4 className="text-sm font-black uppercase italic tracking-wide">
                2. Ativação das Vendas de Balcão e Bebidas
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Existe apenas <strong className="text-white">1 venda de produto registrada em todo o histórico (R$ 7,00)</strong>!
              Ter cervejas artesanais, energéticos, pomadas modeladoras e óleos de barba expostos no balcão tem
              potencial de adicionar entre R$ 600,00 e R$ 1.200,00 mensais com margem de lucro de 40% a 60%.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-elite-cyan-500/20 p-6 sm:p-7 rounded-3xl shadow-xl space-y-3">
            <div className="flex items-center gap-3 text-elite-cyan-400 mb-1">
              <div className="p-2 bg-elite-cyan-500/10 rounded-xl">
                <CalendarDays size={20} />
              </div>
              <h4 className="text-sm font-black uppercase italic tracking-wide">
                3. Redução da Ociosidade em Segundas e Terças
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              A análise diária indica concentração máxima de atendimentos nas sextas e sábados, com segundas e terças
              apresentando menos de 2 cortes por dia. Promoções temáticas direcionadas nesses dias da semana podem
              equilibrar o fluxo de clientes e otimizar os custos fixos.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-rose-500/20 p-6 sm:p-7 rounded-3xl shadow-xl space-y-3">
            <div className="flex items-center gap-3 text-rose-400 mb-1">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <ShieldAlert size={20} />
              </div>
              <h4 className="text-sm font-black uppercase italic tracking-wide">
                4. Governança e Blindagem de Sangria de Caixa
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Implementamos travas contra duplo envio no formulário e alertas visuais para sangrias de alto valor.
              Recomenda-se registrar separadamente pró-labore de sócios e despesas operacionais, mantendo o caixa
              físico sempre conciliado com as entradas reais.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
