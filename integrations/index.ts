export * from './shared/types';
export * from './shared/logger';
export * from './shared/errorHandler';

export * from './primal-genesis';
export * from './divina-l3';

export * from './EventSynchronizer';
export * from './ConfigManager';

// Re-export common types for convenience
export * from './types';

/**
 * Initialize all integrations with the provided configuration
 */
export async function initializeIntegrations(configManager: any) {
  const { PrimalGenesisIntegration } = await import('./primal-genesis');
  const { DivinaL3Integration } = await import('./divina-l3');
  const { EventSynchronizer } = await import('./EventSynchronizer');
  
  const eventSynchronizer = new EventSynchronizer();
  const integrations: any[] = [];

  // Initialize Primal Genesis integration if configured
  const pgConfig = configManager.getConfig('primal-genesis');
  if (pgConfig?.enabled) {
    try {
      const pgIntegration = new PrimalGenesisIntegration(pgConfig);
      await pgIntegration.initialize();
      eventSynchronizer.registerIntegration('primal-genesis', pgIntegration);
      integrations.push(pgIntegration);
      console.log('Primal Genesis integration initialized');
    } catch (error) {
      console.error('Failed to initialize Primal Genesis integration:', error);
      throw error;
    }
  }

  // Initialize Divina-L3 integration if configured
  const dl3Config = configManager.getConfig('divina-l3');
  if (dl3Config?.enabled) {
    try {
      const dl3Integration = new DivinaL3Integration(dl3Config);
      await dl3Integration.initialize();
      eventSynchronizer.registerIntegration('divina-l3', dl3Integration);
      integrations.push(dl3Integration);
      console.log('Divina-L3 integration initialized');
    } catch (error) {
      console.error('Failed to initialize Divina-L3 integration:', error);
      throw error;
    }
  }

  // Add routing rules
  const routingRules = configManager.getRoutingRules();
  for (const rule of routingRules) {
    eventSynchronizer.addRoutingRule(rule);
  }

  // Initialize the event synchronizer
  await eventSynchronizer.initialize();
  
  return {
    eventSynchronizer,
    integrations,
    start: async () => {
      await eventSynchronizer.start();
    },
    stop: async () => {
      await eventSynchronizer.stop();
    }
  };
}

// Export the main initialization function as default
export default initializeIntegrations;
