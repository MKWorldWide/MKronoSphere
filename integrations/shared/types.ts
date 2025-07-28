/**
 * Shared types for MKronoSphere integrations
 */

export interface IntegrationConfig {
  enabled: boolean;
  name: string;
  version: string;
  // Add common configuration properties here
}

export interface EventMetadata {
  id: string;
  timestamp: Date;
  source: string;
  type: string;
  correlationId?: string;
}

export interface IntegrationEvent<T = any> {
  metadata: EventMetadata;
  payload: T;
}

export interface IntegrationAdapter<TConfig = any, TEvent = any> {
  initialize(config: TConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  sendEvent(event: IntegrationEvent<TEvent>): Promise<void>;
  onEvent(callback: (event: IntegrationEvent<TEvent>) => void): void;
}

export interface ErrorHandler {
  handleError(error: Error, context?: Record<string, any>): void;
}

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}
