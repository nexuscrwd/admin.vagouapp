// ============================================================================
// 💈 VAGOUAPP — GERADOR DE PAYLOAD BR CODE (PIX BACEN) & QR CODE
// Padrão Oficial do Banco Central do Brasil (EMVCo / PIX Estático)
// ============================================================================

/**
 * Calcula o CRC16-CCITT (0xFFFF) exigido pela especificação do Banco Central
 */
export function calculatePixCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Normaliza textos removendo acentos e caracteres especiais para compatibilidade EMVCo
 */
function sanitizeEmvText(text: string, maxLen: number): string {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();
  return (normalized || 'VAGOU').slice(0, maxLen).toUpperCase();
}

/**
 * Monta o Payload PIX "Copia e Cola" (BR Code Estático) segundo o Manual de Padrões do BACEN
 */
export function generatePixPayload(params: {
  pixKey: string;
  merchantName: string;
  merchantCity?: string;
  amount?: number;
  txId?: string;
}): string {
  const { pixKey, merchantName, merchantCity = 'SAO PAULO', amount, txId = '***' } = params;

  // Limpa a chave PIX mantendo formatação aceita pelo Bacen
  const cleanKey = pixKey.trim();
  if (!cleanKey) return '';

  const cleanName = sanitizeEmvText(merchantName, 25);
  const cleanCity = sanitizeEmvText(merchantCity, 15);
  const cleanTxId = sanitizeEmvText(txId, 25);

  const formatField = (id: string, value: string): string => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  // GUI do Banco Central
  const gui = formatField('00', 'br.gov.bcb.pix');
  const key = formatField('01', cleanKey);
  const merchantAccountInfo = formatField('26', `${gui}${key}`);

  // Montagem sequencial dos campos EMV
  let payload = '';
  payload += formatField('00', '01'); // Payload Format Indicator
  payload += formatField('01', '12'); // Ponto de Iniciação do Método (12 = Estático reutilizável)
  payload += merchantAccountInfo;
  payload += formatField('52', '0000'); // Merchant Category Code
  payload += formatField('53', '986'); // Moeda BRL (986)

  // Valor (opcional)
  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatField('54', formattedAmount);
  }

  payload += formatField('58', 'BR'); // Código do País
  payload += formatField('59', cleanName); // Nome do Recebedor
  payload += formatField('60', cleanCity); // Cidade

  // Additional Data Field (TxID)
  const additionalData = formatField('05', cleanTxId);
  payload += formatField('62', additionalData);

  // Campo CRC16 sem o valor final
  payload += '6304';

  // Adiciona o CRC16 calculado
  const crc = calculatePixCrc16(payload);
  return `${payload}${crc}`;
}

/**
 * Retorna a URL de alta definição para renderizar o QR Code do PIX
 */
export function getPixQrCodeUrl(payloadOrKey: string, size = 320): string {
  const encoded = encodeURIComponent(payloadOrKey);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encoded}`;
}

/**
 * Monta o link para envio direto no WhatsApp com mensagem de cobrança formatada
 */
export function buildWhatsAppPixChargeUrl(params: {
  phone: string;
  clientName: string;
  salonName: string;
  serviceName: string;
  professionalName?: string;
  amount?: number;
  pixKey: string;
  pixHolderName?: string;
  copiaECola?: string;
}): string {
  const cleanPhone = params.phone.replace(/\D/g, '');
  const phoneToUse = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const formattedAmount =
    params.amount !== undefined && params.amount > 0
      ? `R$ ${params.amount.toFixed(2).replace('.', ',')}`
      : 'A combinar';

  const lines = [
    `Olá, *${params.clientName}*! Tudo bem? 💈`,
    `Agradecemos a sua preferência no *${params.salonName}*!`,
    ``,
    `📋 *Resumo do Atendimento:*`,
    `• Serviço: *${params.serviceName}*`,
    params.professionalName ? `• Profissional: *${params.professionalName}*` : '',
    `• Valor Total: *${formattedAmount}*`,
    ``,
    `💳 *Dados para Pagamento via PIX:*`,
    `• Chave PIX: \`${params.pixKey}\``,
    params.pixHolderName ? `• Titular: *${params.pixHolderName}*` : '',
    ``,
    params.copiaECola
      ? `📲 *PIX Copia e Cola (toque para copiar):*\n\`${params.copiaECola}\`\n`
      : '',
    `Após realizar o pagamento, pode nos enviar o comprovante por aqui. Muito obrigado e até a próxima! ✨`,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return `https://wa.me/${phoneToUse}?text=${encodeURIComponent(lines)}`;
}
