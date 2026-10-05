/**
 * LGPD Cookie & Privacy Consent Banner
 * Barbershop Matheus Farias
 *
 * Implements compliant consent acquisition, granular cookie controls,
 * and transparent terms accordance with LGPD Art. 7, 8 & 9.
 */

import React, { useState, useEffect } from "react";
import { Shield, Check, X, Settings2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { getStoredLGPDConsent, saveLGPDConsent, LGPDConsentRecord } from "../services/lgpdCompliance";
import { Button } from "./UI";

interface LGPDConsentBannerProps {
  onOpenPrivacyPolicy?: () => void;
}

export const LGPDConsentBanner: React.FC<LGPDConsentBannerProps> = ({ onOpenPrivacyPolicy }) => {
  const [consent, setConsent] = useState<LGPDConsentRecord | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [showFullPolicyModal, setShowFullPolicyModal] = useState(false);

  useEffect(() => {
    const existing = getStoredLGPDConsent();
    if (!existing) {
      // Delay display slightly for smooth page entry
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      setConsent(existing);
    }
  }, []);

  const handleAcceptAll = async () => {
    const saved = await saveLGPDConsent({ analytics: true, marketing: true });
    setConsent(saved);
    setIsVisible(false);
  };

  const handleAcceptEssentialOnly = async () => {
    const saved = await saveLGPDConsent({ analytics: false, marketing: false });
    setConsent(saved);
    setIsVisible(false);
  };

  const handleSaveCustom = async () => {
    const saved = await saveLGPDConsent({
      analytics: analyticsConsent,
      marketing: marketingConsent,
    });
    setConsent(saved);
    setIsVisible(false);
  };

  if (!isVisible && !showFullPolicyModal) return null;

  return (
    <>
      {/* Banner Fixed at Bottom */}
      {isVisible && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 animate-in slide-in-from-bottom duration-300 pointer-events-auto">
          <div className="max-w-4xl mx-auto bg-slate-900/95 border border-white/15 rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl p-4 sm:p-6 text-left">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3 sm:gap-4 max-w-2xl">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-elite-red-500/10 border border-elite-red-500/20 flex items-center justify-center text-elite-red-400 shrink-0">
                  <Shield size={22} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-black uppercase text-white tracking-wider">
                      Privacidade & Proteção de Dados (LGPD)
                    </h4>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase border border-emerald-500/30">
                      Lei 13.709/2018
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Utilizamos cookies essenciais e tecnologias criptográficas para garantir sua segurança,
                    proteger suas credenciais e melhorar sua experiência de agendamento na Barbearia Matheus Farias.
                  </p>
                  <button
                    onClick={() => setShowFullPolicyModal(true)}
                    className="text-[10px] text-elite-cyan-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer pt-1"
                  >
                    Ler Política de Privacidade e Direitos do Titular <ExternalLink size={11} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCustomize(!showCustomize)}
                  className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Settings2 size={13} />
                  <span>Personalizar</span>
                  {showCustomize ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button
                  type="button"
                  onClick={handleAcceptEssentialOnly}
                  className="px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 transition-colors cursor-pointer"
                >
                  Apenas Essenciais
                </button>
                <Button
                  onClick={handleAcceptAll}
                  size="sm"
                  variant="primary"
                  className="text-[10px] tracking-wider py-2 px-4 shadow-lg shadow-elite-red-500/20 whitespace-nowrap"
                >
                  Aceitar Todos
                </Button>
              </div>
            </div>

            {/* Granular Customization Drawer */}
            {showCustomize && (
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-200">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-white">1. Essenciais (Obrigatórios)</span>
                    <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Sempre Ativo</span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Necessários para autenticação, segurança contra CSRF/XSS e isolamento de sessão.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-white">2. Métricas de Desempenho</span>
                    <input
                      type="checkbox"
                      checked={analyticsConsent}
                      onChange={(e) => setAnalyticsConsent(e.target.checked)}
                      className="rounded accent-elite-red-500 h-4 w-4 cursor-pointer"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Permite auditar a latência do sistema e otimizar horários de pico da barbearia.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-white">3. Notificações WhatsApp</span>
                    <input
                      type="checkbox"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="rounded accent-elite-red-500 h-4 w-4 cursor-pointer"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Lembretes automáticos e ofertas exclusivas de fidelidade enviadas diretamente ao seu WhatsApp.
                  </p>
                </div>

                <div className="md:col-span-3 flex justify-end pt-2">
                  <Button
                    onClick={handleSaveCustom}
                    size="sm"
                    variant="cyan"
                    className="text-[10px] tracking-wider py-1.5 px-4"
                  >
                    Salvar Minhas Preferências
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Privacy Policy & Data Subject Rights Modal */}
      {showFullPolicyModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-left">
            <div className="p-5 border-b border-white/10 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-elite-red-500/10 border border-elite-red-500/20 flex items-center justify-center text-elite-red-400">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white tracking-wider">
                    Política de Privacidade & Conformidade LGPD
                  </h3>
                  <p className="text-[10px] text-slate-400">Barbearia Matheus Farias • Lei Federal nº 13.709/2018</p>
                </div>
              </div>
              <button
                onClick={() => setShowFullPolicyModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
              <section className="space-y-1.5">
                <h4 className="text-white font-black uppercase text-xs tracking-wider text-elite-cyan-400">
                  1. Finalidade do Tratamento de Dados
                </h4>
                <p>
                  Os dados pessoais coletados (Nome, Celular/WhatsApp, CPF quando informado e histórico de serviços)
                  possuem a finalidade exclusiva de viabilizar o agendamento de atendimentos, emissão de comprovantes,
                  gestão da agenda da barbearia e cumprimento de obrigações legais (Art. 7º, V e IX da LGPD).
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="text-white font-black uppercase text-xs tracking-wider text-elite-cyan-400">
                  2. Medidas de Segurança e Criptografia
                </h4>
                <p>
                  Adotamos padrões rígidos de cibersegurança e Zero Trust:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Todas as conexões são protegidas com TLS 1.3 e HTTPS obrigatório com HSTS.</li>
                  <li>Senhas são salvas com hash SHA-256 com salting criptográfico enterprise.</li>
                  <li>Backups e dados sensíveis em repouso são protegidos com cifra AES-256-GCM.</li>
                  <li>Trilhas de auditoria contam com integridade criptográfica imutável.</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h4 className="text-white font-black uppercase text-xs tracking-wider text-elite-cyan-400">
                  3. Direitos do Titular dos Dados (Art. 18 da LGPD)
                </h4>
                <p>
                  Você possui total controle sobre seus dados pessoais:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Acesso e Confirmação:</strong> Você pode consultar todos os seus agendamentos a qualquer momento.</li>
                  <li><strong>Portabilidade de Dados:</strong> O sistema permite exportação integral dos seus dados em formato JSON ou CSV.</li>
                  <li><strong>Direito ao Esquecimento / Exclusão:</strong> Você pode solicitar a anonimização ou exclusão definitiva de seus dados diretamente na Central de Segurança.</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h4 className="text-white font-black uppercase text-xs tracking-wider text-elite-cyan-400">
                  4. Encarregado de Dados (DPO) e Contato
                </h4>
                <p>
                  Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato diretamente com a
                  gestão da Barbearia Matheus Farias pelo WhatsApp oficial cadastrado ou nas configurações do seu perfil.
                </p>
              </section>
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-950/80 flex justify-end gap-2">
              <Button
                onClick={() => setShowFullPolicyModal(false)}
                variant="primary"
                size="sm"
                className="text-xs py-2 px-5"
              >
                ENTENDIDO & FECHAR
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
