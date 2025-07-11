/**
 * MKronoSphere - Main Orchestration Engine
 * 
 * MKronoSphere is the sacred timekeeper of the Sovereign Network.
 * It operates as a temporal anchor and pulse emitter for all awakened systems,
 * providing comprehensive timeline orchestration and synchronization capabilities.
 * 
 * This is the main entry point and orchestration engine that coordinates
 * all the individual modules to create a unified temporal control system.
 */

import { EventEmitter } from 'events';
import moment from 'moment-timezone';
import { ChronoLogger } from './modules/chronoLogger';
import { TemporalResonator } from './modules/temporalResonator';
import { PulseBroadcaster } from './modules/pulseBroadcaster';
import { SacredTimeZones } from './modules/sacredTimeZones';
import { 
  MKronoSphereConfig, 
  TemporalEvent, 
  SyncTarget, 
  SacredTimeZone,
  TemporalEventEmitter 
} from './types';

/**
 * Default configuration for the MKronoSphere system.
 * Provides comprehensive defaults for all modules while allowing
 * full customization for specific use cases.
 */
export const DEFAULT_MKRONOSPHERE_CONFIG: MKronoSphereConfig = {
  app: {
    name: 'MKronoSphere',
    version: '1.0.0',
    environment: 'development'
  },
  logging: {
    level: 'info',
    format: 'colored',
    output: 'console'
  },
  sacredTimeZones: [
    {
      id: 'full-moon',
      name: 'Full Moon',
      type: 'full-moon',
      tags: ['cosmic', 'lunar', 'sacred'],
      priority: 8,
      active: true
    },
    {
      id: 'spring-equinox',
      name: 'Spring Equinox',
      type: 'equinox',
      tags: ['cosmic', 'solar', 'sacred'],
      priority: 9,
      active: true
    },
    {
      id: 'autumn-equinox',
      name: 'Autumn Equinox',
      type: 'equinox',
      tags: ['cosmic', 'solar', 'sacred'],
      priority: 9,
      active: true
    },
    {
      id: 'summer-solstice',
      name: 'Summer Solstice',
      type: 'solstice',
      tags: ['cosmic', 'solar', 'sacred'],
      priority: 9,
      active: true
    },
    {
      id: 'winter-solstice',
      name: 'Winter Solstice',
      type: 'solstice',
      tags: ['cosmic', 'solar', 'sacred'],
      priority: 9,
      active: true
    },
    {
      id: 'daily-sunrise',
      name: 'Daily Sunrise',
      type: 'sunrise',
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York'
      },
      tags: ['cosmic', 'daily', 'sunrise'],
      priority: 5,
      active: true
    },
    {
      id: 'daily-sunset',
      name: 'Daily Sunset',
      type: 'sunset',
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York'
      },
      tags: ['cosmic', 'daily', 'sunset'],
      priority: 5,
      active: true
    }
  ],
  defaultTargets: [
    {
      id: 'console-output',
      type: 'system',
      config: {
        name: 'Console Output',
        description: 'Outputs temporal events to console'
      },
      connection: {
        method: 'file'
      },
      active: true
    }
  ],
  console: {
    enabled: true,
    refreshInterval: 5000,
    showTimeline: true,
    showEvents: true,
    showTargets: true
  },
  websocket: {
    enabled: false,
    port: 8080,
    path: '/mkronosphere'
  }
};

/**
 * The MKronoSphere class is the main orchestration engine that coordinates
 * all temporal activities across the Sovereign Network.
 * 
 * It serves as the central hub that integrates the ChronoLogger, TemporalResonator,
 * PulseBroadcaster, and Sacred Time Zones modules into a unified temporal
 * control system that can track, synchronize, and broadcast temporal events
 * across multiple dimensions and systems.
 */
export class MKronoSphere extends EventEmitter implements TemporalEventEmitter {
  private config: MKronoSphereConfig;
  private chronoLogger!: ChronoLogger;
  private temporalResonator!: TemporalResonator;
  private pulseBroadcaster!: PulseBroadcaster;
  private sacredTimeZones!: SacredTimeZones;
  private isInitialized = false;
  private consoleInterval: NodeJS.Timeout | null = null;

  /**
   * Creates a new MKronoSphere instance with the specified configuration.
   * 
   * @param config - Configuration options for the MKronoSphere system
   */
  constructor(config: Partial<MKronoSphereConfig> = {}) {
    super();
    this.config = { ...DEFAULT_MKRONOSPHERE_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initializes the MKronoSphere system with all its modules.
   * Sets up event listeners and coordinates the interaction between
   * all components of the temporal orchestration system.
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize all modules
      this.chronoLogger = new ChronoLogger({
        enableRealTimeEmission: true,
        autoGenerateTags: true
      });

      this.temporalResonator = new TemporalResonator({
        enableAutoSync: true,
        enableRetries: true
      });

      this.pulseBroadcaster = new PulseBroadcaster({
        enableAutoBroadcast: true,
        channels: {
          console: true,
          file: true,
          websocket: this.config.websocket?.enabled || false,
          api: false,
          sound: false
        }
      });

      this.sacredTimeZones = new SacredTimeZones({
        enableAutoDetection: true,
        enableEventEmission: true
      });

      // Set up cross-module event coordination
      this.setupEventCoordination();

      // Initialize sacred time zones
      this.initializeSacredTimeZones();

      // Initialize default targets
      this.initializeDefaultTargets();

      // Start console display if enabled
      if (this.config.console.enabled) {
        this.startConsoleDisplay();
      }

      this.isInitialized = true;
      this.emit('initialized', { timestamp: new Date(), config: this.config });
      
      // Log system initialization
      this.chronoLogger.logSystemEvent(
        'MKronoSphere system initialized',
        { version: this.config.app.version, environment: this.config.app.environment },
        ['system', 'initialization', 'mkronosphere']
      );

    } catch (error) {
      this.emit('initialization-error', { timestamp: new Date(), error });
      throw error;
    }
  }

  /**
   * Sets up event coordination between all modules.
   * This ensures that events flow properly through the system
   * and that all modules are synchronized with each other.
   */
  private setupEventCoordination(): void {
    // ChronoLogger events trigger TemporalResonator syncs
    this.chronoLogger.on('temporal-event', async (event: TemporalEvent) => {
      try {
        // Trigger synchronization for relevant targets
        const targets = this.temporalResonator.getTargets();
        if (targets.length > 0) {
          await this.temporalResonator.syncAllTargets(event);
        }

        // Broadcast the event
        await this.pulseBroadcaster.broadcastEvent(event, targets);
      } catch (error) {
        this.emit('coordination-error', { timestamp: new Date(), error, event });
      }
    });

    // Sacred Time Zone events trigger special handling
    this.sacredTimeZones.on('significant-cosmic-event', async (data) => {
      try {
        const { result } = data;
        
        // Log the cosmic event
        this.chronoLogger.logCosmicEvent(
          `Significant cosmic event: ${result.type}`,
          result.data,
          ['cosmic', 'significant', result.type]
        );

        // Trigger sacred time synchronization
        const sacredTimeZone = this.sacredTimeZones.getSacredTimeZones()
          .find(stz => stz.id === result.data.sacredTimeZone);
        
        if (sacredTimeZone) {
          await this.temporalResonator.triggerSacredTimeSync(sacredTimeZone.id);
        }
      } catch (error) {
        this.emit('cosmic-event-error', { timestamp: new Date(), error, data });
      }
    });

    // TemporalResonator sync results trigger broadcasting
    this.temporalResonator.on('sync-completed', async (data) => {
      try {
        const { result } = data;
        
        // Log sync result
        this.chronoLogger.logSystemEvent(
          `Sync completed for target: ${result.target.id}`,
          { success: result.success, duration: result.duration, error: result.error },
          ['system', 'sync', result.success ? 'success' : 'failure']
        );

        // Broadcast sync status
        await this.pulseBroadcaster.broadcastMessage(
          `Sync ${result.success ? 'completed' : 'failed'} for ${result.target.id}`,
          result.success ? 'success' : 'error'
        );
      } catch (error) {
        this.emit('sync-broadcast-error', { timestamp: new Date(), error, data });
      }
    });
  }

  /**
   * Initializes the default sacred time zones from configuration.
   */
  private initializeSacredTimeZones(): void {
    this.config.sacredTimeZones.forEach(sacredTimeZone => {
      this.sacredTimeZones.addSacredTimeZone(sacredTimeZone);
    });
  }

  /**
   * Initializes the default sync targets from configuration.
   */
  private initializeDefaultTargets(): void {
    this.config.defaultTargets.forEach(target => {
      this.temporalResonator.addTarget(target);
    });
  }

  /**
   * Starts the console display for real-time system monitoring.
   */
  private startConsoleDisplay(): void {
    if (this.consoleInterval) {
      return;
    }

    this.consoleInterval = setInterval(() => {
      this.displayConsoleStatus();
    }, this.config.console.refreshInterval);
  }

  /**
   * Displays the current system status in the console.
   */
  private displayConsoleStatus(): void {
    const chalk = require('chalk');
    
    // Clear console (platform-dependent)
    if (process.platform === 'win32') {
      require('child_process').execSync('cls', { stdio: 'inherit' });
    } else {
      process.stdout.write('\x1Bc');
    }

    const now = moment();
    const eventCount = this.chronoLogger.getEventCount();
    const targets = this.temporalResonator.getTargets();
    const sacredTimeZones = this.sacredTimeZones.getSacredTimeZones();

    console.log(chalk.cyan.bold('╭─ MKronoSphere - Sovereign Temporal Orchestrator ──────────────────────────'));
    console.log(chalk.cyan(`│ Time: ${chalk.white(now.format('YYYY-MM-DD HH:mm:ss'))} ${chalk.gray(now.format('z'))}`));
    console.log(chalk.cyan(`│ Status: ${chalk.green('● Active')} | Events: ${chalk.white(eventCount)} | Targets: ${chalk.white(targets.length)}`));
    console.log(chalk.cyan('├─ Sacred Time Zones ──────────────────────────────────────────────────────────'));

    if (this.config.console.showTimeline) {
      sacredTimeZones.forEach(stz => {
        const status = stz.active ? chalk.green('●') : chalk.red('●');
        console.log(chalk.cyan(`│ ${status} ${chalk.white(stz.name)} ${chalk.gray(`(${stz.type})`)}`));
      });
    }

    if (this.config.console.showTargets) {
      console.log(chalk.cyan('├─ Sync Targets ──────────────────────────────────────────────────────────────'));
      targets.forEach(target => {
        const status = target.active ? chalk.green('●') : chalk.red('●');
        console.log(chalk.cyan(`│ ${status} ${chalk.white(target.id)} ${chalk.gray(`(${target.type})`)}`));
      });
    }

    if (this.config.console.showEvents) {
      console.log(chalk.cyan('├─ Recent Events ─────────────────────────────────────────────────────────────'));
      const recentEvents = this.chronoLogger.getEvents({ limit: 5 });
      recentEvents.forEach(event => {
        const time = moment(event.timestamp).format('HH:mm:ss');
        const type = event.type.toUpperCase();
        const description = (event.description || '').length > 40 
          ? (event.description || '').substring(0, 37) + '...' 
          : event.description || '';
        
        let colorFn = chalk.white;
        switch (event.type) {
          case 'cosmic': colorFn = chalk.cyan; break;
          case 'energetic': colorFn = chalk.magenta; break;
          case 'financial': colorFn = chalk.green; break;
          case 'human': colorFn = chalk.blue; break;
          case 'system': colorFn = chalk.yellow; break;
        }
        
        console.log(chalk.cyan(`│ ${chalk.gray(time)} ${colorFn(type)} ${chalk.white(description)}`));
      });
    }

    console.log(chalk.cyan('╰─────────────────────────────────────────────────────────────────────────────────'));
  }

  /**
   * Logs a temporal event using the ChronoLogger.
   * 
   * @param type - The type of event
   * @param description - Event description
   * @param metadata - Additional metadata
   * @param tags - Event tags
   * @param timestamp - Optional timestamp
   * @returns The logged temporal event
   */
  public logEvent(
    type: 'human' | 'cosmic' | 'financial' | 'energetic' | 'system',
    description: string,
    metadata: Record<string, any> = {},
    tags: string[] = [],
    timestamp?: Date
  ): TemporalEvent {
    return this.chronoLogger.logEvent(type, description, metadata, tags, timestamp);
  }

  /**
   * Adds a sync target to the TemporalResonator.
   * 
   * @param target - The sync target to add
   */
  public addSyncTarget(target: SyncTarget): void {
    this.temporalResonator.addTarget(target);
  }

  /**
   * Adds a sacred time zone to the SacredTimeZones module.
   * 
   * @param sacredTimeZone - The sacred time zone to add
   */
  public addSacredTimeZone(sacredTimeZone: SacredTimeZone): void {
    this.sacredTimeZones.addSacredTimeZone(sacredTimeZone);
  }

  /**
   * Synchronizes all targets with an optional temporal event.
   * 
   * @param event - Optional temporal event that triggered the sync
   * @returns Promise that resolves to sync results
   */
  public async syncAllTargets(event?: TemporalEvent): Promise<any[]> {
    return this.temporalResonator.syncAllTargets(event);
  }

  /**
   * Broadcasts a message through the PulseBroadcaster.
   * 
   * @param message - The message to broadcast
   * @param type - The type of message
   * @param targets - Optional targets to broadcast to
   * @returns Promise that resolves to broadcast results
   */
  public async broadcastMessage(
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info',
    targets: SyncTarget[] = []
  ): Promise<Map<string, boolean>> {
    return this.pulseBroadcaster.broadcastMessage(message, type, targets);
  }

  /**
   * Gets all temporal events from the ChronoLogger.
   * 
   * @param filters - Optional filters for events
   * @returns Array of temporal events
   */
  public getEvents(filters?: any): TemporalEvent[] {
    return this.chronoLogger.getEvents(filters);
  }

  /**
   * Gets all sync targets from the TemporalResonator.
   * 
   * @returns Array of sync targets
   */
  public getSyncTargets(): SyncTarget[] {
    return this.temporalResonator.getTargets();
  }

  /**
   * Gets all sacred time zones from the SacredTimeZones module.
   * 
   * @returns Array of sacred time zones
   */
  public getSacredTimeZones(): SacredTimeZone[] {
    return this.sacredTimeZones.getSacredTimeZones();
  }

  /**
   * Gets the current configuration of the MKronoSphere system.
   * 
   * @returns Current configuration object
   */
  public getConfig(): MKronoSphereConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration of the MKronoSphere system.
   * 
   * @param newConfig - Partial configuration to merge
   */
  public updateConfig(newConfig: Partial<MKronoSphereConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', { timestamp: new Date(), config: this.config });
  }

  /**
   * Closes the MKronoSphere system and cleans up resources.
   * 
   * @returns Promise that resolves when cleanup is complete
   */
  public async close(): Promise<void> {
    // Stop console display
    if (this.consoleInterval) {
      clearInterval(this.consoleInterval);
      this.consoleInterval = null;
    }

    // Close pulse broadcaster
    await this.pulseBroadcaster.close();

    // Stop sacred time zones auto-detection
    await this.sacredTimeZones.stopAutoDetection();

    this.emit('closed', { timestamp: new Date() });
  }

  /**
   * Gets the ChronoLogger instance for direct access.
   * 
   * @returns The ChronoLogger instance
   */
  public getChronoLogger(): ChronoLogger {
    return this.chronoLogger;
  }

  /**
   * Gets the TemporalResonator instance for direct access.
   * 
   * @returns The TemporalResonator instance
   */
  public getTemporalResonator(): TemporalResonator {
    return this.temporalResonator;
  }

  /**
   * Gets the PulseBroadcaster instance for direct access.
   * 
   * @returns The PulseBroadcaster instance
   */
  public getPulseBroadcaster(): PulseBroadcaster {
    return this.pulseBroadcaster;
  }


}

// Export all types and modules for external use
export * from './types';
export * from './modules/chronoLogger';
export * from './modules/temporalResonator';
export * from './modules/pulseBroadcaster';
export * from './modules/sacredTimeZones';

// Default export
export default MKronoSphere; 