import { PrimalGenesisIntegration } from './primal-genesis';
import { DivinaL3Integration } from './divina-l3';
import { IntegrationEvent } from './shared/types';
import { defaultLogger } from './shared/logger';

type IntegrationType = 'primal-genesis' | 'divina-l3';

interface IntegrationMap {
  'primal-genesis'?: PrimalGenesisIntegration;
  'divina-l3'?: DivinaL3Integration;
}

interface EventRoutingRule {
  source: IntegrationType | 'any';
  target: IntegrationType | 'all';
  eventTypes?: string[];
  transform?: (event: IntegrationEvent<any>) => IntegrationEvent<any>;
}

export class EventSynchronizer {
  private integrations: IntegrationMap = {};
  private routingRules: EventRoutingRule[] = [];
  private logger = defaultLogger;
  private isInitialized = false;

  /**
   * Register an integration
   */
  public registerIntegration<T extends IntegrationType>(
    type: T,
    integration: IntegrationMap[T]
  ): void {
    if (this.integrations[type]) {
      this.logger.warn(`Integration ${type} is already registered`);
      return;
    }

    this.integrations[type] = integration;
    this.logger.info(`Registered integration: ${type}`);
  }

  /**
   * Add an event routing rule
   */
  public addRoutingRule(rule: EventRoutingRule): void {
    this.routingRules.push(rule);
    this.logger.debug('Added routing rule', { rule });
  }

  /**
   * Initialize the event synchronizer
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('EventSynchronizer is already initialized');
      return;
    }

    // Set up event listeners for all registered integrations
    for (const [type, integration] of Object.entries(this.integrations)) {
      if (integration) {
        this.setupIntegrationListener(type as IntegrationType, integration);
      }
    }

    this.isInitialized = true;
    this.logger.info('EventSynchronizer initialized');
  }

  /**
   * Set up event listeners for an integration
   */
  private setupIntegrationListener(
    sourceType: IntegrationType,
    integration: any
  ): void {
    integration.onEvent((event: IntegrationEvent<any>) => {
      this.handleEvent(sourceType, event);
    });

    this.logger.debug(`Event listener set up for ${sourceType}`);
  }

  /**
   * Handle an incoming event and route it according to the rules
   */
  private async handleEvent(
    sourceType: IntegrationType,
    event: IntegrationEvent<any>
  ): Promise<void> {
    this.logger.debug(`Received event from ${sourceType}`, {
      eventId: event.metadata.id,
      type: event.metadata.type
    });

    // Find all matching routing rules
    const matchingRules = this.routingRules.filter(rule => {
      // Check if the source matches
      const sourceMatch = rule.source === 'any' || rule.source === sourceType;
      
      // Check if the event type matches
      const typeMatch = !rule.eventTypes || 
        rule.eventTypes.includes(event.metadata.type);
      
      return sourceMatch && typeMatch;
    });

    if (matchingRules.length === 0) {
      this.logger.debug('No matching routing rules found for event', {
        eventId: event.metadata.id,
        source: sourceType
      });
      return;
    }

    // Process each matching rule
    for (const rule of matchingRules) {
      try {
        await this.processRoutingRule(rule, sourceType, event);
      } catch (error) {
        this.logger.error('Error processing routing rule', {
          rule,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Process a single routing rule
   */
  private async processRoutingRule(
    rule: EventRoutingRule,
    sourceType: IntegrationType,
    event: IntegrationEvent<any>
  ): Promise<void> {
    // Apply transformation if defined
    const transformedEvent = rule.transform ? rule.transform(event) : event;

    // Determine target integrations
    const targetIntegrations = this.getTargetIntegrations(rule.target, sourceType);

    if (targetIntegrations.length === 0) {
      this.logger.warn('No target integrations found for rule', { rule });
      return;
    }

    // Forward the event to all target integrations
    await Promise.all(
      targetIntegrations.map(async target => {
        try {
          await this.forwardEvent(target, transformedEvent);
        } catch (error) {
          this.logger.error('Error forwarding event', {
            target: target.type,
            eventId: transformedEvent.metadata.id,
            error: error instanceof Error ? error.message : String(error)
          });
          // Consider implementing retry logic here
        }
      })
    );
  }

  /**
   * Get the target integrations for a rule
   */
  private getTargetIntegrations(
    target: IntegrationType | 'all',
    sourceType: IntegrationType
  ): { type: IntegrationType; integration: any }[] {
    if (target === 'all') {
      return Object.entries(this.integrations)
        .filter(([type, integration]) => 
          type !== sourceType && integration !== undefined
        )
        .map(([type, integration]) => ({
          type: type as IntegrationType,
          integration
        }));
    }

    const integration = this.integrations[target];
    return integration ? [{ type: target, integration }] : [];
  }

  /**
   * Forward an event to a target integration
   */
  private async forwardEvent(
    target: { type: IntegrationType; integration: any },
    event: IntegrationEvent<any>
  ): Promise<void> {
    this.logger.debug(`Forwarding event to ${target.type}`, {
      eventId: event.metadata.id,
      target: target.type
    });

    // The actual forwarding logic depends on the target integration
    // This is a simplified example - you might need to adapt it based on your needs
    if (target.type === 'primal-genesis') {
      await target.integration.sendEvent(event);
    } else if (target.type === 'divina-l3') {
      await target.integration.sendEvent(event);
    } else {
      throw new Error(`Unsupported target integration: ${target.type}`);
    }

    this.logger.debug(`Event forwarded to ${target.type}`, {
      eventId: event.metadata.id
    });
  }

  /**
   * Start all integrations
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    for (const [type, integration] of Object.entries(this.integrations)) {
      if (integration) {
        try {
          await integration.start();
          this.logger.info(`Started integration: ${type}`);
        } catch (error) {
          this.logger.error(`Failed to start integration ${type}`, {
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      }
    }
  }

  /**
   * Stop all integrations
   */
  public async stop(): Promise<void> {
    for (const [type, integration] of Object.entries(this.integrations)) {
      if (integration) {
        try {
          await integration.stop();
          this.logger.info(`Stopped integration: ${type}`);
        } catch (error) {
          this.logger.error(`Error stopping integration ${type}`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
  }
}
