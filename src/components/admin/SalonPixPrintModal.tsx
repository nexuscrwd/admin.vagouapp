import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  Copy,
  Check,
  QrCode,
  Store,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { generatePixPayload, getPixQrCodeUrl } from '../../services/pixGenerator';

export interface SalonPixPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonName: string;
  logoUrl?: string;
  pixKey: string;
  pixKeyType?: string;
  holderName?: string;
  institution?: string;
  city?: string;
}

export const SalonPixPrintModal: React.FC<SalonPixPrintModalProps> = ({
  isOpen,
  onClose,
  salonName,
  logoUrl,
  pixKey,
  pixKeyType,
  holderName,
  institution,
  city = 'São Paulo',
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  if (!isOpen || !pixKey) return null;

  const resolvedHolderName = holderName || salonName || 'Estabelecimento';
  const brCodePayload = generatePixPayload({
    pixKey,
    merchantName: resolvedHolderName,
    merchantCity: city,
  });
  const qrCodeUrl = getPixQrCodeUrl(brCodePayload || pixKey, 360);

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

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* Estilos dedicados para impressão limpa de plaquinha de balcão */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #pix-printable-card, #pix-printable-card * {
            visibility: visible;
          }
          #pix-printable-card {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            max-width: 420px;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            background: #fff !important;
            color: #000 !important;
            padding: 24px !important;
            page-break-inside: avoid;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-all text-white font-['Poppins']">
        {/* Cabeçalho do Modal */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                Plaquinha PIX de Balcão & Bancada
              </h3>
              <p className="text-[11px] text-slate-400">
                Pronta para visualização, display acrílico ou impressão
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

        {/* Área Rolável / Visualização da Plaquinha */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* CARTÃO IMPRESSÍVEL (PLAQUINHA DE BALCÃO) */}
          <div
            id="pix-printable-card"
            className="p-5 sm:p-6 rounded-2xl bg-white text-slate-900 border-2 border-emerald-500 shadow-xl flex flex-col items-center text-center space-y-3.5 relative overflow-hidden"
          >
            {/* Faixa Superior com Logotipo e Nome do Estabelecimento */}
            <div className="flex items-center justify-center gap-2.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={salonName}
                  className="w-10 h-10 object-contain rounded-xl border border-slate-200 p-0.5"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  <Store className="w-5 h-5 text-emerald-400" />
                </div>
              )}
              <div className="text-left">
                <h4 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                  {salonName}
                </h4>
                <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-700 block">
                  Pague com PIX
                </span>
              </div>
            </div>

            {/* Selo / Banner do Banco Central */}
            <div className="w-full py-1 px-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Chave Verificada • Banco Central</span>
            </div>

            {/* QR CODE ALTA DEFINIÇÃO */}
            <div className="p-2.5 rounded-2xl bg-slate-50 border-2 border-slate-200 shadow-inner flex flex-col items-center justify-center">
              <img
                src={qrCodeUrl}
                alt="QR Code PIX Oficial"
                className="w-52 h-52 sm:w-56 sm:h-56 object-contain"
              />
              <span className="text-[10px] font-medium text-slate-500 mt-1 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-slate-400" />
                Aponte a câmera no app do seu banco
              </span>
            </div>

            {/* Dados da Chave PIX e Titular */}
            <div className="w-full space-y-1 pt-1 border-t border-slate-200">
              <div className="flex items-center justify-center gap-1 text-xs">
                <span className="text-slate-500 font-medium">Chave PIX:</span>
                <strong className="text-slate-900 font-mono font-bold">{pixKey}</strong>
              </div>
              <div className="text-[11px] text-slate-600">
                Titular: <strong className="text-slate-900">{resolvedHolderName}</strong>
                {institution ? ` • ${institution}` : ''}
              </div>
            </div>

            <div className="text-[9px] text-slate-400 tracking-wider uppercase font-semibold">
              VagouApp • Sistema Oficial de Pagamentos
            </div>
          </div>

          {/* Ações e Códigos (Apenas na Tela / no-print) */}
          <div className="space-y-2 no-print">
            <div className="grid grid-cols-2 gap-2">
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
            </div>
          </div>
        </div>

        {/* Rodapé com Botão Imprimir */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 no-print">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Printer className="w-4 h-4 text-white" />
            <span className="text-white">Imprimir Plaquinha de Balcão</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
