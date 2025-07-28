import { BaseIntegration } from '../shared/BaseIntegration';
import { PrimalGenesisConfig, PrimalGenesisEvent } from './types';
import { PrimalGenesisAuth } from './auth';
import { IntegrationEvent } from '../shared/types';
import { defaultLogger } from '../shared/logger';

export class PrimalGenesisIntegration extends BaseIntegration<PrimalGenesisConfig, PrimalGenesisEvent> {
  private auth: PrimalGenesisAuth;
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second delay
  private maxReconnectDelay = 30000; // Max 30 seconds delay

  constructor(config: PrimalGenesisConfig) {
    super(config);
    this.auth = new PrimalGenesisAuth(config, this.logger);
  }

  /**
   * Set up the integration
   */
  protected async setup(): Promise<void> {
    this.logger.debug('Setting up Primal Genesis integration');
    await this.auth.initialize();
  }

  /**
   * Start the integration
   */
  protected async onStart(): Promise<void> {
    this.logger.info('Starting Primal Genesis integration');
    await this.connectToEventStream();
  }

  /**
   * Stop the integration
   */
  protected async onStop(): Promise<void> {
    this.logger.info('Stopping Primal Genesis integration');
    this.disconnectFromEventStream();
    this.auth.cleanup();
  }

  /**
   * Send an event to the Primal Genesis API
   */
  protected async onSendEvent(event: IntegrationEvent<PrimalGenesisEvent>): Promise<void> {
    const accessToken = await this.auth.getAccessToken();
    
    const response = await fetch(`${this.config.apiUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Request-Id': event.metadata.id,
        'X-Event-Type': event.metadata.type
      },
      body: JSON.stringify(event.payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to send event: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Connect to the Primal Genesis event stream
   */
  private async connectToEventStream(): Promise<void> {
    if (this.eventSource) {
      this.logger.debug('Event stream already connected');
      return;
    }

    try {
      const accessToken = await this.auth.getAccessToken();
      const eventStreamUrl = `${this.config.apiUrl}/events/stream?token=${encodeURIComponent(accessToken)}`;
      
      this.logger.debug(`Connecting to event stream: ${eventStreamUrl}`);
      
      this.eventSource = new EventSource(eventStreamUrl);
      
      this.eventSource.onopen = () => {
        this.logger.info('Connected to Primal Genesis event stream');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000; // Reset reconnect delay on successful connection
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data) as PrimalGenesisEvent;
          this.handleIncomingEvent(eventData);
        } catch (error) {
          this.logger.error('Error processing event', { error, data: event.data });
        }
      };
      
      this.eventSource.onerror = (error) => {
        this.logger.error('Event stream error', { error });
        this.handleStreamError();
      };
      
    } catch (error) {
      this.logger.error('Failed to connect to event stream', { error });
      this.handleStreamError();
    }
  }

  /**
   * Handle disconnection from the event stream
   */
  private disconnectFromEventStream(): void {
    if (this.eventSource) {
      this.logger.debug('Disconnecting from event stream');
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Handle errors from the event stream and attempt to reconnect
   */
  private handleStreamError(): void {
    this.disconnectFromEventStream();
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached, giving up');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    this.logger.warn(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connectToEventStream().catch(error => {
        this.logger.error('Failed to reconnect to event stream', { error });
      });
    }, delay);
  }

  /**
   * Process an incoming event from the Primal Genesis API
   */
  private handleIncomingEvent(eventData: PrimalGenesisEvent): void {
    try {
      const integrationEvent: IntegrationEvent<PrimalGenesisEvent> = {
        metadata: {
          id: eventData.id,
          timestamp: new Date(eventData.timestamp),
          source: 'primal-genesis',
          type: eventData.type,
          correlationId: eventData.metadata?.correlationId
        },
        payload: eventData
      };

      this.logger.debug('Received event', { 
        eventId: eventData.id,
        type: eventData.type,
        timestamp: eventData.timestamp
      });

      // Emit the event to all registered callbacks
      this.emitEvent(integrationEvent);
      
    } catch (error) {
      this.logger.error('Error handling incoming event', { 
        error, 
        eventData 
      });
    }
  }

  /**
   * Query events from the Primal Genesis API
   */
  public async queryEvents(params: {
    types?: string[];
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<PrimalGenesisEvent[]> {
    const accessToken = await this.auth.getAccessToken();
    
    const queryParams = new URLSearchParams();
    
    if (params.types?.length) {
      queryParams.append('types', params.types.join(','));
    }
    
    if (params.startTime) {
      queryParams.append('startTime', params.startTime.toISOString());
    }
    
    if (params.endTime) {
      queryParams.append('endTime', params.endTime.toISOString());
    }
    
    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    
    if (params.offset !== undefined) {
      queryParams.append('offset', params.offset.toString());
    }
    
    const response = await fetch(`${this.config.apiUrl}/events?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to query events: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
