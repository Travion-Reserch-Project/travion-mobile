/**
 * Logger utility for consistent logging across the app
 */
class Logger {
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = __DEV__;
  }

  log(...args: any[]) {
    if (this.isEnabled) {
      console.log('[Travion]', ...args);
    }
  }

  info(...args: any[]) {
    if (this.isEnabled) {
      console.info('[Travion Info]', ...args);
    }
  }

  warn(...args: any[]) {
    if (this.isEnabled) {
      console.warn('[Travion Warning]', ...args);
    }
  }

  error(...args: any[]) {
    if (this.isEnabled) {
      console.error('[Travion Error]', ...args);
    }
  }
}

export const logger = new Logger();
