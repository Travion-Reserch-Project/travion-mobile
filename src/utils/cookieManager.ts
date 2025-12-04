import AsyncStorage from '@react-native-async-storage/async-storage';

export class CookieManager {
  private static readonly COOKIE_KEY = '@travion:cookies';

  static async getCookies(): Promise<Record<string, string>> {
    try {
      const cookiesJson = await AsyncStorage.getItem(this.COOKIE_KEY);
      return cookiesJson ? JSON.parse(cookiesJson) : {};
    } catch (error) {
      console.error('Error getting cookies:', error);
      return {};
    }
  }

  static async getCookie(name: string): Promise<string | null> {
    const cookies = await this.getCookies();
    return cookies[name] || null;
  }

  static async setCookie(name: string, value: string): Promise<void> {
    try {
      const cookies = await this.getCookies();
      cookies[name] = value;
      await AsyncStorage.setItem(this.COOKIE_KEY, JSON.stringify(cookies));
    } catch (error) {
      console.error('Error setting cookie:', error);
    }
  }

  static async removeCookie(name: string): Promise<void> {
    try {
      const cookies = await this.getCookies();
      delete cookies[name];
      await AsyncStorage.setItem(this.COOKIE_KEY, JSON.stringify(cookies));
    } catch (error) {
      console.error('Error removing cookie:', error);
    }
  }

  static async clearCookies(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.COOKIE_KEY);
    } catch (error) {
      console.error('Error clearing cookies:', error);
    }
  }
}
