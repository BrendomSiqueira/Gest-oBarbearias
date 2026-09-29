/**
 * Módulo de Criptografia, Assinatura Digital e Segurança de Links
 * Barbershop Matheus Farias - Camada Avançada de Criptografia & Tokens Assinados
 */

export interface SignedLinkToken {
  /** ID do barbeiro / proprietário */
  uid: string;
  /** Alias para compatibilidade com o sistema de agendamento */
  barberId: string;
  /** Escopo de permissão restrito (ex: 'public_booking') */
  scope: 'public_booking' | 'client_portal' | 'appointment_view';
  /** Timestamp de emissão (ms) */
  iat: number;
  /** Timestamp de expiração (ms) */
  exp: number;
  /** Identificador único do token para proteção contra replay */
  nonce: string;
  /** Se o link é de uso único */
  singleUse?: boolean;
  /** Nome ou identificador opcional do cliente para personalização */
  clientName?: string;
  /** Versão da chave de assinatura */
  ver?: number;
}

export interface VerificationResult {
  valid: boolean;
  payload?: SignedLinkToken;
  error?: string;
  message?: string;
  errorCode?: 'EXPIRED' | 'INVALID_SIGNATURE' | 'ALREADY_USED' | 'REVOKED' | 'MALFORMED';
}

// Chave mestra interna do cliente para assinatura de tokens (derivada de sementes seguras com fallback resiliente)
const SECRET_SEED_KEY = 'barber_system_hmac_secret_v1';
const REVOKED_TOKENS_KEY = 'barber_revoked_tokens';
const REDEEMED_TOKENS_KEY = 'barber_redeemed_single_use_tokens';

/**
 * Obtém ou inicializa a chave mestra HMAC de assinatura no storage local seguro
 */
function getSystemSigningSecret(): string {
  try {
    let secret = localStorage.getItem(SECRET_SEED_KEY);
    if (!secret) {
      // Gera uma chave criptográfica forte com Web Crypto API
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      secret = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(SECRET_SEED_KEY, secret);
    }
    return secret;
  } catch {
    return 'mf_barber_fallback_secure_key_2026_x87b';
  }
}

/**
 * Converte string para base64 URL safe
 */
function toBase64Url(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Converte base64 URL safe de volta para string
 */
function fromBase64Url(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Calcula assinatura HMAC-SHA256 ou digest seguro com Web Crypto
 */
async function computeSignature(data: string, secret: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hashArray = Array.from(new Uint8Array(signature));
    const base64Str = btoa(String.fromCharCode(...hashArray));
    return toBase64Url(base64Str);
  } catch (err) {
    // Fallback digest SHA-256
    const encoder = new TextEncoder();
    const combined = encoder.encode(`${secret}::${data}::${secret}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const base64Str = btoa(String.fromCharCode(...hashArray));
    return toBase64Url(base64Str);
  }
}

/**
 * Gera um token assinado digitalmente com escopo, expiração e integridade criptográfica
 */
export async function generateSignedToken(
  uid: string,
  options?: {
    expiresInHours?: number;
    scope?: 'public_booking' | 'client_portal' | 'appointment_view';
    singleUse?: boolean;
    clientName?: string;
  }
): Promise<string> {
  const expiresInHours = options?.expiresInHours ?? 168; // 7 dias por padrão
  const scope = options?.scope ?? 'public_booking';
  const singleUse = options?.singleUse ?? false;

  const now = Date.now();
  const exp = now + expiresInHours * 60 * 60 * 1000;

  // Nonce criptográfico de alta entropia
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  const payload: SignedLinkToken = {
    uid,
    barberId: uid,
    scope,
    iat: now,
    exp,
    nonce,
    singleUse,
    ver: 1,
  };

  if (options?.clientName?.trim()) {
    payload.clientName = options.clientName.trim();
  }

  const payloadJson = JSON.stringify(payload);
  const encodedPayload = toBase64Url(payloadJson);
  const secret = getSystemSigningSecret();
  const signature = await computeSignature(encodedPayload, secret);

  // Formato: <payload_base64url>.<signature_base64url>
  return `${encodedPayload}.${signature}`;
}

/**
 * Valida a integridade, assinatura e expiração de um token
 */
export async function verifySignedToken(token: string): Promise<VerificationResult> {
  if (!token || typeof token !== 'string') {
    const msg = 'Token não fornecido ou inválido';
    return { valid: false, error: msg, message: msg, errorCode: 'MALFORMED' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 2) {
    const msg = 'Estrutura do token malformada';
    return { valid: false, error: msg, message: msg, errorCode: 'MALFORMED' };
  }

  const [encodedPayload, providedSignature] = parts;

  try {
    const payloadJson = fromBase64Url(encodedPayload);
    const payload: SignedLinkToken = JSON.parse(payloadJson);

    // Garante que barberId e uid existam
    if (!payload.barberId && payload.uid) {
      payload.barberId = payload.uid;
    }
    if (!payload.uid && payload.barberId) {
      payload.uid = payload.barberId;
    }

    // 1. Valida estrutura do payload
    if (!payload.uid || !payload.exp || !payload.nonce) {
      const msg = 'Parâmetros de integridade ausentes no token';
      return { valid: false, error: msg, message: msg, errorCode: 'MALFORMED' };
    }

    // 2. Valida assinatura HMAC
    const secret = getSystemSigningSecret();
    const expectedSignature = await computeSignature(encodedPayload, secret);

    if (providedSignature !== expectedSignature) {
      const msg = 'Assinatura digital inválida ou manipulada';
      return { valid: false, error: msg, message: msg, errorCode: 'INVALID_SIGNATURE' };
    }

    // 3. Valida expiração temporal
    const now = Date.now();
    if (now > payload.exp) {
      const msg = 'O link de agendamento expirou';
      return { valid: false, error: msg, message: msg, errorCode: 'EXPIRED' };
    }

    // 4. Verifica se foi revogado administrativamente
    const revoked = getRevokedNonces();
    if (revoked.has(payload.nonce)) {
      const msg = 'Este link foi revogado por segurança';
      return { valid: false, error: msg, message: msg, errorCode: 'REVOKED' };
    }

    // 5. Verifica se é de uso único e já foi consumido
    if (payload.singleUse) {
      const redeemed = getRedeemedNonces();
      if (redeemed.has(payload.nonce)) {
        const msg = 'Este link de agendamento era de uso único e já foi utilizado';
        return { valid: false, error: msg, message: msg, errorCode: 'ALREADY_USED' };
      }
    }

    return { valid: true, payload };
  } catch (err: any) {
    const msg = 'Falha na decodificação do token de segurança';
    return { valid: false, error: msg, message: msg, errorCode: 'MALFORMED' };
  }
}

/**
 * Marca um token de uso único como consumido
 */
export function redeemSingleUseToken(tokenOrNonce: string): boolean {
  try {
    let nonce = tokenOrNonce;
    if (tokenOrNonce.includes('.')) {
      const parts = tokenOrNonce.split('.');
      const payload: SignedLinkToken = JSON.parse(fromBase64Url(parts[0]));
      nonce = payload.nonce;
    }

    const redeemed = getRedeemedNonces();
    redeemed.add(nonce);
    localStorage.setItem(REDEEMED_TOKENS_KEY, JSON.stringify(Array.from(redeemed)));
    return true;
  } catch (err) {
    console.error('Erro ao resgatar token de uso único:', err);
    return false;
  }
}

/**
 * Revoga todos os tokens assinados gerados anteriormente (rotaciona segredo)
 */
export function revokeAllSigningTokens(): void {
  try {
    // Gera novo segredo criptográfico
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const newSecret = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(SECRET_SEED_KEY, newSecret);
    localStorage.removeItem(REVOKED_TOKENS_KEY);
    localStorage.removeItem(REDEEMED_TOKENS_KEY);
  } catch (err) {
    console.error('Erro ao rotacionar chaves de assinatura:', err);
  }
}

/**
 * Helper para obter conjunto de nonces revogados
 */
function getRevokedNonces(): Set<string> {
  try {
    const raw = localStorage.getItem(REVOKED_TOKENS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

/**
 * Helper para obter conjunto de nonces de uso único já consumidos
 */
function getRedeemedNonces(): Set<string> {
  try {
    const raw = localStorage.getItem(REDEEMED_TOKENS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

/**
 * Gera URL oficial de agendamento protegida por token criptografado
 */
export async function generateSignedBookingUrl(
  userId: string,
  options?: {
    expiresInHours?: number;
    singleUse?: boolean;
    clientName?: string;
  }
): Promise<string> {
  const token = await generateSignedToken(userId, {
    expiresInHours: options?.expiresInHours ?? 168,
    scope: 'public_booking',
    singleUse: options?.singleUse ?? false,
    clientName: options?.clientName,
  });

  const origin = window.location.origin;
  // O link utiliza apenas o parâmetro criptografado 'sec' sem expor IDs em texto simples
  return `${origin}/?sec=${encodeURIComponent(token)}`;
}

/**
 * Sanitiza inputs contra ataques XSS, HTML Injection e caracteres maliciosos
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Remove < e > para prevenir tags HTML
    .replace(/javascript:/gi, '') // Remove esquemas de URI maliciosos
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onclick=/gi, '')
    .trim();
}
