import { Logger as ILogger } from './types';

/**
 * Default logger implementation for MKronoSphere integrations
 */
export class Logger implements ILogger {
  private name: string;
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor(name: string, logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.name = name;
    this.logLevel = logLevel;
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${this.name}] ${message}`;
    
    if (meta) {
      try {
        formatted += ' ' + JSON.stringify(meta, null, 2);
      } catch (e) {
        // If we can't stringify the meta, just append it directly
        formatted += ' ' + String(meta);
      }
    }
    
    return formatted;
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage(`[DEBUG] ${message}`, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage(`[INFO] ${message}`, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(`[WARN] ${message}`, meta));
    }
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage(`[ERROR] ${message}`, meta));
    }
  }
}

// Default logger instance
export const defaultLogger = new Logger('MKronoSphere:Integrations');
