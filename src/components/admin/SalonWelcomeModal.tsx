import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Share2,
  Copy,
  Check,
  Printer,
  ExternalLink,
  Download,
  Smartphone,
  Building2,
  X,
  QrCode,
  Info,
} from 'lucide-react';

export interface SalonWelcomeData {
  tradeName: string;
  slug: string;
  slogan?: string;
  logoUrl?: string;
  primaryColor?: string;
  ownerName?: string;
}

export interface SalonWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SalonWelcomeData | null;
}

export const SalonWelcomeModal: React.FC<SalonWelcomeModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen || !data) return null;

  const { tradeName, slug, slogan, logoUrl, primaryColor = '#20C933' } = data;

  const cleanSlug = slug || 'meu-espaco';
  const clientUrl = `https://${cleanSlug}.vagouapp.com`;
  const partnerUrl = `https://seunegocio.vagouapp.com`;
  const qrCodeImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(
    clientUrl
  )}&format=png&margin=10`;

  const handleCopyClientUrl = async () => {
    try {
      await navigator.clipboard.writeText(clientUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback silencioso
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tradeName,
          text: `Agende seu horário online no ${tradeName}!`,
          url: clientUrl,
        });
      } catch {
        handleCopyClientUrl();
      }
    } else {
      handleCopyClientUrl();
    }
  };

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  };

  const handlePrintQRCode = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>QR Code de Balcão - ${tradeName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Poppins', sans-serif;
              background-color: #ffffff;
              color: #0f172a;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .card {
              width: 100%;
              max-width: 460px;
              border: 3px solid #0f172a;
              border-radius: 28px;
              padding: 40px 32px;
              text-align: center;
              background: #ffffff;
            }
            .logo-box {
              width: 80px;
              height: 80px;
              margin: 0 auto 16px auto;
              border-radius: 20px;
              background-color: ${primaryColor};
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .logo-box span {
              font-size: 28px;
              font-weight: 900;
              color: #ffffff;
              text-transform: uppercase;
            }
            .title {
              font-size: 26px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 6px;
              line-height: 1.2;
            }
            .slogan {
              font-size: 13px;
              font-weight: 500;
              color: #64748b;
              margin-bottom: 24px;
            }
            .qr-wrapper {
              background: #f8fafc;
              border-radius: 20px;
              padding: 20px;
              display: inline-block;
              margin-bottom: 20px;
            }
            .qr-wrapper img {
              width: 220px;
              height: 220px;
              display: block;
            }
            .instruction {
              font-size: 16px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 6px;
            }
            .sub-instruction {
              font-size: 12px;
              color: #64748b;
              margin-bottom: 18px;
            }
            .url-badge {
              display: inline-block;
              background-color: #f1f5f9;
              padding: 8px 18px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 700;
              color: #0f172a;
            }
            @media print {
              body { background: none; padding: 0; }
              .card { border-color: #000; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo-box">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="${tradeName}" />`
                  : `<span>${(tradeName || 'S').slice(0, 2)}</span>`
              }
            </div>
            <h1 class="title">${tradeName}</h1>
            ${slogan ? `<p class="slogan">${slogan}</p>` : ''}
            
            <div class="qr-wrapper">
              <img id="qr-img" src="${qrCodeImgUrl}" alt="QR Code" />
            </div>

            <p class="instruction">Aponte a câmera do seu celular</p>
            <p class="sub-instruction">Escaneie o código acima para consultar horários disponíveis e agendar online.</p>
            
            <div class="url-badge">${clientUrl}</div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    };

    const qrImg = doc.getElementById('qr-img') as HTMLImageElement | null;
    if (qrImg && !qrImg.complete) {
      qrImg.onload = () => setTimeout(triggerPrint, 200);
      qrImg.onerror = () => setTimeout(triggerPrint, 200);
    } else {
      setTimeout(triggerPrint, 350);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn overflow-y-auto font-['Poppins']">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Cabeçalho de Boas-Vindas */}
        <div className="relative p-6 text-center bg-slate-950/60 border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-[#20C933] text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            O {tradeName} foi criado com sucesso!
          </h2>

          <p className="text-xs text-emerald-400 font-semibold mt-1">
            Parabéns por dar este grande passo para o futuro do seu negócio!
          </p>
        </div>

        {/* Corpo Plano (Flat Layout sem Box-dentro-de-Box) */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto divide-y divide-slate-800/80 text-xs">
          {/* 1. Mensagem Emotiva & Orientação */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sua nova vitrine digital já está ativa</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              Que este novo ciclo traga agenda cheia, clientes encantados e muito mais tempo livre para você focar no seu talento.
            </p>
            <div className="flex items-start gap-2 pt-1 text-[11px] text-amber-300 font-medium">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Acesse as opções do aplicativo para inserir as demais informações: serviços, valores, equipe de profissionais, fotos e horários de atendimento.
              </span>
            </div>
          </div>

          {/* 2. Link do App para Copiar ou Compartilhar */}
          <div className="pt-4 space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Link Exclusivo de Agendamento
            </label>
            <div className="flex items-center gap-2 bg-slate-950 rounded-xl p-1.5 pl-3.5">
              <span className="text-xs font-mono font-bold text-white truncate flex-1">
                {clientUrl}
              </span>

              <button
                type="button"
                onClick={handleCopyClientUrl}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-300" />
                    <span>Copiar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="py-2 px-3 rounded-lg bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Compartilhar</span>
              </button>
            </div>
          </div>

          {/* 3. QR Code para Imprimir (Para Balcão) */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white p-2.5 rounded-2xl shrink-0 text-center">
              <img
                src={qrCodeImgUrl}
                alt={`QR Code ${tradeName}`}
                className="w-28 h-28 object-contain mx-auto"
              />
            </div>

            <div className="space-y-2.5 flex-1 text-center sm:text-left">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>QR Code para Balcão</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  Imprima e deixe no balcão ou recepção para que seus clientes apontem a câmera e agendem facilmente.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePrintQRCode}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir QR Code para Balcão</span>
              </button>
            </div>
          </div>

          {/* 4. Botões Baixar / Abrir App em Nova Aba */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {deferredPrompt ? (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="p-3 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/15 whitespace-nowrap"
              >
                <Download className="w-4 h-4 text-white shrink-0" />
                <span className="text-white">Baixar e Instalar App</span>
              </button>
            ) : (
              <a
                href={partnerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/15 whitespace-nowrap"
              >
                <Download className="w-4 h-4 text-white shrink-0" />
                <span className="text-white">Abrir / Baixar App</span>
                <ExternalLink className="w-3.5 h-3.5 text-white shrink-0" />
              </a>
            )}

            <a
              href={clientUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Abrir Vitrine em Nova Aba</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </a>
          </div>
        </div>

        {/* Rodapé Fixo de Ação (sticky bottom-0 z-20) */}
        <div className="sticky bottom-0 z-20 p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-[#20C933] hover:bg-[#1bb32d] text-white font-bold text-xs transition cursor-pointer shadow-md shadow-emerald-500/20 whitespace-nowrap"
          >
            <span className="text-white">Concluir e Começar</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
