import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  MessageCircle,
  QrCode,
  Copy,
  Check,
  Store,
  DollarSign,
  User,
  Sparkles,
  Smartphone,
  Send,
  ExternalLink,
} from 'lucide-react';
import {
  generatePixPayload,
  getPixQrCodeUrl,
  buildWhatsAppPixChargeUrl,
} from '../../services/pixGenerator';

export interface PixCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonName: string;
  pixKey: string;
  pixHolderName?: string;
  clientName?: string;
  clientPhone?: string;
  serviceName?: string;
  professionalName?: string;
  initialAmount?: number;
}

export const PixCheckoutModal: React.FC<PixCheckoutModalProps> = ({
  isOpen,
  onClose,
  salonName,
  pixKey,
  pixHolderName,
  clientName = 'Cliente',
  clientPhone = '',
  serviceName = 'Atendimento',
  professionalName,
  initialAmount = 50.0,
}) => {
  const [amount, setAmount] = useState<number>(initialAmount);
  const [phone, setPhone] = useState<string>(clientPhone);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  if (!isOpen || !pixKey) return null;

  const resolvedHolder = pixHolderName || salonName;
  const brCodePayload = generatePixPayload({
    pixKey,
    merchantName: resolvedHolder,
    amount: amount > 0 ? amount : undefined,
  });
  const qrCodeUrl = getPixQrCodeUrl(brCodePayload || pixKey, 340);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(brCodePayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const url = buildWhatsAppPixChargeUrl({
      phone: phone || clientPhone,
      clientName,
      salonName,
      serviceName,
      professionalName,
      amount,
      pixKey,
      pixHolderName: resolvedHolder,
      copiaECola: brCodePayload,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white font-['Poppins']">
        {/* Cabeçalho */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#20C933]/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                Cobrança PIX — Término do Atendimento
              </h3>
              <p className="text-[11px] text-slate-400">
                Mostre o QR Code na tela ou envie no WhatsApp do cliente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Rolável */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Card Resumo do Atendimento */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Dados do Serviço
              </span>
              <span className="text-emerald-400 font-semibold text-[11px]">{salonName}</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <strong className="text-white block text-sm">{serviceName}</strong>
                <span className="text-slate-400 text-[11px]">
                  Cliente: <span className="text-slate-200 font-semibold">{clientName}</span>
                  {professionalName ? ` • Profissional: ${professionalName}` : ''}
                </span>
              </div>
            </div>

            {/* Ajuste de Valor e Telefone do Cliente */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Valor Total (R$)</label>
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                  <span className="text-slate-500 font-bold mr-1">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="w-full bg-transparent text-white font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">WhatsApp do Cliente</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono outline-none"
                />
              </div>
            </div>
          </div>

          {/* QR Code Dinâmico com o Valor em Tela Cheia */}
          <div className="p-4 rounded-2xl bg-white text-slate-900 flex flex-col items-center justify-center text-center space-y-2 border border-slate-200 shadow-md">
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Escaneie com o app do Banco
              </span>
              <span className="text-xs font-black text-emerald-600 font-mono">
                R$ {amount.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <img
              src={qrCodeUrl}
              alt="QR Code de Cobrança PIX"
              className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
            />

            <div className="w-full pt-1 border-t border-slate-200 text-center">
              <div className="text-[11px] font-mono font-bold text-slate-900">{pixKey}</div>
              <div className="text-[10px] text-slate-500 truncate">
                Titular: {resolvedHolder}
              </div>
            </div>
          </div>

          {/* Botões de Ação Imediata */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full py-3 px-4 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <MessageCircle className="w-4 h-4 text-white fill-white" />
              <span className="text-white">Enviar PIX no WhatsApp do Cliente</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyPayload}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedPayload ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copia e Cola Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>PIX Copia e Cola</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyKey}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedKey ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Chave Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar Chave</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
          >
            Concluir / Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
