import { ErrorHandler as IErrorHandler } from './types';
import { defaultLogger } from './logger';

/**
 * Default error handler for MKronoSphere integrations
 */
export class ErrorHandler implements IErrorHandler {
  private logger = defaultLogger;

  constructor(private readonly name: string) {}

  handleError(error: Error, context: Record<string, any> = {}): void {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ...context
    };

    this.logger.error(`[${this.name}] Unhandled error: ${error.message}`, errorInfo);

    // TODO: Implement error reporting to monitoring service
    // this.reportToMonitoringService(error, context);
  }

  // private async reportToMonitoringService(error: Error, context: Record<string, any>): Promise<void> {
  //   // Implementation for reporting errors to a monitoring service
  //   // This could be Sentry, DataDog, or any other error tracking service
  // }
}

// Default error handler instance
export const defaultErrorHandler = new ErrorHandler('MKronoSphere:Integrations');
