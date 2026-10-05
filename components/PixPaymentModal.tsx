import React, { useState } from 'react';
import { QrCode, Copy, Check, X, ShieldCheck, DollarSign } from 'lucide-react';
import { Button } from './UI';
import { generatePixPayload, getPixQrCodeUrl, formatPixKeyDisplay, PixKeyType } from '../services/pixService';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pixKey: string;
  pixKeyType?: PixKeyType;
  beneficiaryName: string;
  city?: string;
  bankName?: string;
  amount?: number;
  description?: string;
  txId?: string;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  onClose,
  pixKey,
  pixKeyType = 'random',
  beneficiaryName,
  city = 'FORTALEZA',
  bankName,
  amount,
  description,
  txId,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  if (!isOpen) return null;

  const effectiveType: PixKeyType = (pixKeyType as PixKeyType) || 'random';

  const payload = generatePixPayload({
    key: pixKey,
    keyType: effectiveType,
    beneficiaryName,
    city,
    amount,
    description: description || 'Servico Barbearia',
    txId: txId || 'BARBER' + Date.now().toString().slice(-6),
  });

  const qrCodeUrl = getPixQrCodeUrl(payload, 280);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <QrCode size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Pagamento via PIX
              </h3>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                Instantâneo & Seguro
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

        {/* Body */}
        <div className="p-6 space-y-6 text-center max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Valor (se houver) */}
          {amount && amount > 0 && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Valor do Pagamento
              </span>
              <span className="text-3xl font-black text-emerald-400 tracking-tight">
                R$ {amount.toFixed(2)}
              </span>
            </div>
          )}

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center">
            <div className="p-3 bg-white rounded-3xl shadow-xl border-4 border-emerald-500/30">
              <img
                src={qrCodeUrl}
                alt="QR Code PIX"
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-2xl"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">
              Abra o app do seu banco e aponte a câmera para o QR Code
            </p>
          </div>

          {/* Detalhes do Favorecido */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/5 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                Beneficiário:
              </span>
              <span className="font-black text-white uppercase truncate max-w-[200px]">
                {beneficiaryName || 'Barbearia'}
              </span>
            </div>
            {bankName && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  Instituição/Banco:
                </span>
                <span className="font-bold text-slate-300">{bankName}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs pt-1 border-t border-white/5">
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                Chave ({effectiveType.toUpperCase()}):
              </span>
              <span className="font-mono text-emerald-400 font-bold truncate max-w-[200px]">
                {formatPixKeyDisplay(pixKey, effectiveType)}
              </span>
            </div>
          </div>

          {/* Botões de Cópia */}
          <div className="space-y-3">
            <Button
              variant="cyan"
              className="w-full h-12 text-xs font-black tracking-widest flex items-center justify-center gap-2"
              onClick={handleCopyPayload}
            >
              {copiedPayload ? (
                <>
                  <Check size={16} /> CÓDIGO PIX COPIADO!
                </>
              ) : (
                <>
                  <Copy size={16} /> COPIAR CÓDIGO PIX COPIA E COLA
                </>
              )}
            </Button>

            <button
              onClick={handleCopyKey}
              className="w-full py-2 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedKey ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-emerald-400">Chave PIX copiada!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar apenas a Chave PIX</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Padrão Oficial Banco Central do Brasil</span>
          </div>
        </div>
      </div>
    </div>
  );
};
