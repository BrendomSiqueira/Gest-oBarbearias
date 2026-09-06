
export async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`barber_auth_${password}_salt_2026`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36);
  }
}

export class StorageService {
  private static prefix = 'barberpro_v2_';

  static set(key: string, value: any): void {
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
  }

  static get<T>(key: string): T | null {
    const item = localStorage.getItem(this.prefix + key);
    return item ? JSON.parse(item) : null;
  }

  static remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  static clearUser(username: string): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes(`_${username}_`)) {
        localStorage.removeItem(key);
      }
    });
  }
}
