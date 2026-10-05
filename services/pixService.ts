/**
 * Serviço Especializado em Chaves PIX e Pagamentos Instantâneos (Banco Central do Brasil)
 * Barbershop Matheus Farias
 *
 * Suporta:
 * - Validação e formatação de Chaves PIX (CPF, CNPJ, Celular, E-mail, EVP / Aleatória)
 * - Geração de Payload Padrão BR Code (EMV® / Banco Central) para PIX Copia e Cola
 * - Cálculo de Checksum CRC16-CCITT (Polinômio 0x1021) conforme especificação oficial do BACEN
 * - Geração de QR Code dinâmico e estático
 */

export type PixKeyType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'random';

export interface PixConfig {
  key: string;
  type: PixKeyType;
  beneficiaryName: string;
  city?: string;
  bankName?: string;
}

export interface GeneratePixPayloadOptions {
  key: string;
  keyType?: PixKeyType;
  beneficiaryName: string;
  city?: string;
  amount?: number;
  txId?: string;
  description?: string;
}

/**
 * Remove caracteres não alfanuméricos mantendo formato essencial
 */
export function cleanPixKey(key: string, type: PixKeyType): string {
  if (!key) return '';
  const trimmed = key.trim();
  switch (type) {
    case 'cpf':
    case 'cnpj':
      return trimmed.replace(/\D/g, '');
    case 'phone': {
      const numbers = trimmed.replace(/\D/g, '');
      if (numbers.startsWith('55') && numbers.length > 11) {
        return '+' + numbers;
      }
      return numbers.length >= 10 ? '+55' + numbers : '+' + numbers;
    }
    case 'email':
      return trimmed.toLowerCase();
    case 'random':
    default:
      return trimmed;
  }
}

/**
 * Formata chave PIX para exibição amigável
 */
export function formatPixKeyDisplay(key: string, type: PixKeyType): string {
  if (!key) return '';
  const clean = key.trim();
  switch (type) {
    case 'cpf': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length === 11) {
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      }
      return clean;
    }
    case 'cnpj': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length === 14) {
        return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      }
      return clean;
    }
    case 'phone': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length >= 10) {
        const withoutCountry = digits.startsWith('55') ? digits.slice(2) : digits;
        if (withoutCountry.length === 11) {
          return withoutCountry.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (withoutCountry.length === 10) {
          return withoutCountry.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
      }
      return clean;
    }
    case 'email':
      return clean.toLowerCase();
    case 'random':
      return clean;
    default:
      return clean;
  }
}

/**
 * Validação de integridade da chave PIX
 */
export function validatePixKey(key: string, type: PixKeyType): { valid: boolean; message?: string } {
  if (!key || !key.trim()) {
    return { valid: false, message: 'Chave PIX não pode ser vazia.' };
  }
  const clean = key.trim();

  switch (type) {
    case 'cpf': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length !== 11) {
        return { valid: false, message: 'CPF deve conter exatamente 11 dígitos numéricos.' };
      }
      return { valid: true };
    }
    case 'cnpj': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length !== 14) {
        return { valid: false, message: 'CNPJ deve conter exatamente 14 dígitos numéricos.' };
      }
      return { valid: true };
    }
    case 'phone': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) {
        return { valid: false, message: 'Celular deve conter DDD + 8 ou 9 dígitos (ex: 85999999999).' };
      }
      return { valid: true };
    }
    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clean)) {
        return { valid: false, message: 'Formato de e-mail inválido para chave PIX.' };
      }
      return { valid: true };
    }
    case 'random': {
      if (clean.length < 32) {
        return { valid: false, message: 'Chave aleatória (EVP) costuma conter 32 a 36 caracteres.' };
      }
      return { valid: true };
    }
    default:
      return { valid: true };
  }
}

/**
 * Formata um campo no padrão EMV (ID + Tamanho 2 dígitos + Valor)
 */
function formatEMVField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Remove acentos e caracteres especiais para compatibilidade com o padrão BACEN
 */
function normalizeText(text: string, maxLength: number): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .slice(0, maxLength);
}

/**
 * Calcula CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF)
 */
function calculateCRC16(str: string): string {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
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
 * Gera o payload oficial do PIX Copia e Cola (BR Code EMV)
 */
export function generatePixPayload(options: GeneratePixPayloadOptions): string {
  const {
    key,
    keyType = 'random',
    beneficiaryName,
    city = 'BRASILIA',
    amount,
    txId = '***',
    description,
  } = options;

  const sanitizedKey = cleanPixKey(key, keyType);
  const sanitizedBeneficiary = normalizeText(beneficiaryName || 'BARBEARIA', 25);
  const sanitizedCity = normalizeText(city || 'FORTALEZA', 15);
  const sanitizedTxId = (txId || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

  // 00 - Payload Format Indicator (01)
  let emv = formatEMVField('00', '01');

  // 26 - Merchant Account Information (PIX)
  // GUI = br.gov.bcb.pix
  let merchantAccount = formatEMVField('00', 'br.gov.bcb.pix');
  merchantAccount += formatEMVField('01', sanitizedKey);
  if (description) {
    merchantAccount += formatEMVField('02', normalizeText(description, 40));
  }
  emv += formatEMVField('26', merchantAccount);

  // 52 - Merchant Category Code
  emv += formatEMVField('52', '0000');

  // 53 - Transaction Currency (986 = Real BRL)
  emv += formatEMVField('53', '986');

  // 54 - Transaction Amount (se houver valor fixo)
  if (amount && amount > 0) {
    emv += formatEMVField('54', amount.toFixed(2));
  }

  // 58 - Country Code (BR)
  emv += formatEMVField('58', 'BR');

  // 59 - Merchant Name
  emv += formatEMVField('59', sanitizedBeneficiary);

  // 60 - Merchant City
  emv += formatEMVField('60', sanitizedCity);

  // 62 - Additional Data Field Template (txid)
  const additionalData = formatEMVField('05', sanitizedTxId);
  emv += formatEMVField('62', additionalData);

  // 63 - CRC16 (Calculado sobre toda a string incluindo '6304')
  const payloadWithoutCRC = emv + '6304';
  const crc16 = calculateCRC16(payloadWithoutCRC);

  return payloadWithoutCRC + crc16;
}

/**
 * Retorna a URL de imagem do QR Code para o payload PIX
 */
export function getPixQrCodeUrl(payload: string, size: number = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(payload)}`;
}
