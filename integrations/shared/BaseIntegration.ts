import { IntegrationAdapter, IntegrationConfig, IntegrationEvent, Logger } from './types';
import { defaultLogger } from './logger';
import { defaultErrorHandler } from './errorHandler';

/**
 * Base class for all MKronoSphere integrations
 */
export abstract class BaseIntegration<TConfig extends IntegrationConfig, TEvent = any> 
  implements IntegrationAdapter<TConfig, TEvent> 
{
  protected config: TConfig;
  protected logger: Logger;
  protected isInitialized: boolean = false;
  protected isRunning: boolean = false;
  protected eventCallbacks: Array<(event: IntegrationEvent<TEvent>) => void> = [];

  constructor(config: TConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || defaultLogger;
  }

  /**
   * Initialize the integration with the provided configuration
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Integration already initialized');
      return;
    }

    try {
      this.logger.info(`Initializing ${this.constructor.name}...`);
      await this.setup();
      this.isInitialized = true;
      this.logger.info(`${this.constructor.name} initialized successfully`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to initialize ${this.constructor.name}: ${err.message}`, {
        stack: err.stack
      });
      throw err;
    }
  }

  /**
   * Start the integration
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Integration must be initialized before starting');
    }

    if (this.isRunning) {
      this.logger.warn('Integration is already running');
      return;
    }

    try {
      this.logger.info(`Starting ${this.constructor.name}...`);
      await this.onStart();
      this.isRunning = true;
      this.logger.info(`${this.constructor.name} started successfully`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to start ${this.constructor.name}: ${err.message}`, {
        stack: err.stack
      });
      throw err;
    }
  }

  /**
   * Stop the integration
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Integration is not running');
      return;
    }

    try {
      this.logger.info(`Stopping ${this.constructor.name}...`);
      await this.onStop();
      this.isRunning = false;
      this.logger.info(`${this.constructor.name} stopped successfully`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error stopping ${this.constructor.name}: ${err.message}`, {
        stack: err.stack
      });
      throw err;
    }
  }

  /**
   * Send an event through the integration
   */
  public async sendEvent(event: IntegrationEvent<TEvent>): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Integration is not running');
    }

    try {
      await this.onSendEvent(event);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error sending event: ${err.message}`, {
        event,
        stack: err.stack
      });
      throw err;
    }
  }

  /**
   * Register an event callback
   */
  public onEvent(callback: (event: IntegrationEvent<TEvent>) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Emit an event to all registered callbacks
   */
  protected emitEvent(event: IntegrationEvent<TEvent>): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`Error in event callback: ${err.message}`, {
          event,
          stack: err.stack
        });
      }
    }
  }

  // Abstract methods to be implemented by subclasses
  protected abstract setup(): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onSendEvent(event: IntegrationEvent<TEvent>): Promise<void>;
}
