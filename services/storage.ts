
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
