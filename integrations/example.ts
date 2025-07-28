import { ConfigManager } from './ConfigManager';
import { initializeIntegrations } from '.';
import { defaultLogger } from './shared/logger';

async function main() {
  // Set up the configuration manager
  const configManager = new ConfigManager();
  
  // Load configuration from environment variables
  configManager.loadFromEnv();
  
  // Or configure programmatically
  configManager.addRoutingRule({
    source: 'primal-genesis',
    target: 'divina-l3',
    eventTypes: ['user.created', 'order.completed'],
    transform: (event) => {
      // Transform the event payload if needed
      return {
        ...event,
        payload: {
          ...event.payload,
          processedAt: new Date().toISOString()
        }
      };
    }
  });

  // Validate the configuration
  const { valid, errors } = configManager.validate();
  if (!valid) {
    console.error('Configuration validation failed:', errors);
    process.exit(1);
  }

  try {
    // Initialize all integrations
    const { eventSynchronizer, start, stop } = await initializeIntegrations(configManager);
    
    // Start the integrations
    await start();
    
    // Handle graceful shutdown
    const shutdown = async () => {
      defaultLogger.info('Shutting down...');
      await stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    // Example of sending an event
    if (eventSynchronizer) {
      // Simulate an incoming event from Primal Genesis
      setTimeout(() => {
        eventSynchronizer.emitEvent({
          metadata: {
            id: 'event-123',
            timestamp: new Date(),
            source: 'primal-genesis',
            type: 'user.created',
            correlationId: 'corr-123'
          },
          payload: {
            userId: 'user-123',
            email: 'user@example.com',
            name: 'John Doe'
          }
        });
      }, 2000);
    }
    
  } catch (error) {
    console.error('Failed to initialize integrations:', error);
    process.exit(1);
  }
}

main().catch(console.error);
