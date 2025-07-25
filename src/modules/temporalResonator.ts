/**
 * MKronoSphere - TemporalResonator Module
 * 
 * The TemporalResonator is the synchronization engine that coordinates
 * multiple systems, repositories, and agents based on temporal events
 * and sacred time zones. It serves as the conductor of the Sovereign
 * Network's temporal orchestra.
 * 
 * Key Features:
 * - Multi-target synchronization based on temporal triggers
 * - Sacred time zone integration for cosmic alignment
 * - Intelligent scheduling and condition evaluation
 * - Real-time coordination across distributed systems
 * - Configurable sync strategies and protocols
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as cron from 'node-cron';
import { TemporalEvent, SyncTarget, SacredTimeZone, SyncResult, TemporalEventEmitter } from '../types';

/**
 * Configuration options for the TemporalResonator module.
 * Controls synchronization behavior, scheduling, and target management.
 */
export interface TemporalResonatorConfig {
  /** Whether to enable automatic synchronization */
  enableAutoSync: boolean;
  /** Default timezone for scheduling operations */
  defaultTimezone: string;
  /** Maximum number of concurrent sync operations */
  maxConcurrentSyncs: number;
  /** Timeout for sync operations in milliseconds */
  syncTimeout: number;
  /** Whether to retry failed sync operations */
  enableRetries: boolean;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Delay between retry attempts in milliseconds */
  retryDelay: number;
  /** Whether to log sync operations */
  enableSyncLogging: boolean;
  /** Custom sync strategies */
  syncStrategies?: Record<string, SyncStrategy>;
}

/**
 * Defines a synchronization strategy for coordinating with targets.
 * Each strategy implements specific logic for different types of
 * synchronization scenarios.
 */
export interface SyncStrategy {
  /** Unique identifier for the strategy */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the strategy's purpose */
  description: string;
  /** Function that executes the sync operation */
  execute: (target: SyncTarget, event?: TemporalEvent) => Promise<SyncResult>;
  /** Function that validates if the strategy can be used with a target */
  canHandle: (target: SyncTarget) => boolean;
  /** Priority of this strategy (higher numbers = higher priority) */
  priority: number;
}

/**
 * Default configuration for the TemporalResonator module.
 * Provides sensible defaults while allowing full customization.
 */
export const DEFAULT_TEMPORAL_RESONATOR_CONFIG: TemporalResonatorConfig = {
  enableAutoSync: true,
  defaultTimezone: 'UTC',
  maxConcurrentSyncs: 5,
  syncTimeout: 30000,
  enableRetries: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableSyncLogging: true
};

/**
 * Built-in synchronization strategies for common target types.
 * These provide out-of-the-box functionality for typical use cases.
 */
export const BUILT_IN_SYNC_STRATEGIES: Record<string, SyncStrategy> = {
  'http-webhook': {
    id: 'http-webhook',
    name: 'HTTP Webhook',
    description: 'Sends HTTP POST requests to webhook endpoints',
    priority: 1,
    canHandle: (target: SyncTarget) => 
      target.type === 'system' && target.connection?.method === 'http',
    execute: async (target: SyncTarget, event?: TemporalEvent): Promise<SyncResult> => {
      const startTime = Date.now();
      
      try {
        if (!target.connection?.url) {
          throw new Error('No URL specified for HTTP webhook target');
        }

        const response = await fetch(target.connection.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': target.connection.token ? `Bearer ${target.connection.token}` : '',
            'X-MKronoSphere-Event': event?.id || 'manual-sync',
            'X-MKronoSphere-Timestamp': new Date().toISOString()
          },
          body: JSON.stringify({
            event,
            target: target.id,
            timestamp: new Date().toISOString(),
            source: 'mkronosphere'
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const duration = Date.now() - startTime;
        return {
          target,
          success: true,
          timestamp: new Date(),
          duration,
          metadata: {
            statusCode: response.status,
            responseSize: response.headers.get('content-length')
          }
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        return {
          target,
          success: false,
          timestamp: new Date(),
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  },

  'file-system': {
    id: 'file-system',
    name: 'File System',
    description: 'Writes sync events to files on the local filesystem',
    priority: 2,
    canHandle: (target: SyncTarget) => 
      target.type === 'system' && target.connection?.method === 'file',
    execute: async (target: SyncTarget, event?: TemporalEvent): Promise<SyncResult> => {
      const startTime = Date.now();
      
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const syncData = {
          event,
          target: target.id,
          timestamp: new Date().toISOString(),
          source: 'mkronosphere'
        };

        const fileName = `sync-${target.id}-${Date.now()}.json`;
        const filePath = path.join(process.cwd(), 'sync-logs', fileName);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Write sync data
        await fs.writeFile(filePath, JSON.stringify(syncData, null, 2));

        const duration = Date.now() - startTime;
        return {
          target,
          success: true,
          timestamp: new Date(),
          duration,
          metadata: {
            filePath,
            fileSize: JSON.stringify(syncData).length
          }
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        return {
          target,
          success: false,
          timestamp: new Date(),
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  },

  'websocket': {
    id: 'websocket',
    name: 'WebSocket',
    description: 'Sends real-time messages via WebSocket connections',
    priority: 3,
    canHandle: (target: SyncTarget) => 
      target.type === 'system' && target.connection?.method === 'websocket',
    execute: async (target: SyncTarget, event?: TemporalEvent): Promise<SyncResult> => {
      const startTime = Date.now();
      
      try {
        const WebSocket = (await import('ws')).default;
        
        if (!target.connection?.url) {
          throw new Error('No URL specified for WebSocket target');
        }

        return new Promise((resolve) => {
          const ws = new WebSocket(target.connection!.url!);
          
          const syncData = {
            event,
            target: target.id,
            timestamp: new Date().toISOString(),
            source: 'mkronosphere'
          };

          ws.on('open', () => {
            ws.send(JSON.stringify(syncData));
            ws.close();
          });

          ws.on('error', (error) => {
            const duration = Date.now() - startTime;
            resolve({
              target,
              success: false,
              timestamp: new Date(),
              duration,
              error: error.message
            });
          });

          ws.on('close', () => {
            const duration = Date.now() - startTime;
            resolve({
              target,
              success: true,
              timestamp: new Date(),
              duration,
              metadata: {
                connectionType: 'websocket'
              }
            });
          });
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        return {
          target,
          success: false,
          timestamp: new Date(),
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  }
};

/**
 * The TemporalResonator class provides comprehensive synchronization
 * capabilities for coordinating multiple systems based on temporal events.
 * 
 * It serves as the central coordination hub for the MKronoSphere system,
 * managing the complex task of keeping multiple targets in sync with
 * temporal events and sacred time zones.
 */
export class TemporalResonator extends EventEmitter implements TemporalEventEmitter {
  private targets: Map<string, SyncTarget> = new Map();
  private sacredTimeZones: Map<string, SacredTimeZone> = new Map();
  private config: TemporalResonatorConfig;
  private syncStrategies: Map<string, SyncStrategy> = new Map();
  private activeSyncs: Set<string> = new Set();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isInitialized = false;

  /**
   * Creates a new TemporalResonator instance with the specified configuration.
   * 
   * @param config - Configuration options for the resonator
   */
  constructor(config: Partial<TemporalResonatorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_TEMPORAL_RESONATOR_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initializes the TemporalResonator with the current configuration.
   * Sets up built-in sync strategies and prepares the system for operation.
   */
  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Register built-in sync strategies
    Object.values(BUILT_IN_SYNC_STRATEGIES).forEach(strategy => {
      this.registerSyncStrategy(strategy);
    });

    // Register custom strategies if provided
    if (this.config.syncStrategies) {
      Object.values(this.config.syncStrategies).forEach(strategy => {
        this.registerSyncStrategy(strategy);
      });
    }

    this.isInitialized = true;
    this.emit('initialized', { timestamp: new Date(), config: this.config });
  }

  /**
   * Registers a synchronization strategy for use with targets.
   * 
   * @param strategy - The sync strategy to register
   */
  public registerSyncStrategy(strategy: SyncStrategy): void {
    this.syncStrategies.set(strategy.id, strategy);
    this.emit('strategy-registered', { timestamp: new Date(), strategy });
  }

  /**
   * Adds a sync target to the resonator's management.
   * 
   * @param target - The sync target to add
   */
  public addTarget(target: SyncTarget): void {
    this.targets.set(target.id, target);
    
    // Set up scheduling if configured
    if (target.schedule?.cron) {
      this.setupTargetSchedule(target);
    }
    
    this.emit('target-added', { timestamp: new Date(), target });
  }

  /**
   * Removes a sync target from the resonator's management.
   * 
   * @param targetId - The ID of the target to remove
   */
  public removeTarget(targetId: string): void {
    const target = this.targets.get(targetId);
    if (target) {
      this.targets.delete(targetId);
      
      // Clean up scheduling
      const cronJob = this.cronJobs.get(targetId);
      if (cronJob) {
        cronJob.stop();
        this.cronJobs.delete(targetId);
      }
      
      this.emit('target-removed', { timestamp: new Date(), target });
    }
  }

  /**
   * Adds a sacred time zone for temporal synchronization.
   * 
   * @param sacredTimeZone - The sacred time zone to add
   */
  public addSacredTimeZone(sacredTimeZone: SacredTimeZone): void {
    this.sacredTimeZones.set(sacredTimeZone.id, sacredTimeZone);
    this.emit('sacred-time-zone-added', { timestamp: new Date(), sacredTimeZone });
  }

  /**
   * Synchronizes a specific target with an optional temporal event.
   * 
   * @param targetId - The ID of the target to synchronize
   * @param event - Optional temporal event that triggered the sync
   * @returns Promise that resolves to the sync result
   */
  public async syncTarget(targetId: string, event?: TemporalEvent): Promise<SyncResult> {
    const target = this.targets.get(targetId);
    if (!target) {
      throw new Error(`Target not found: ${targetId}`);
    }

    if (!target.active) {
      return {
        target,
        success: false,
        timestamp: new Date(),
        duration: 0,
        error: 'Target is not active'
      };
    }

    // Check if we're at the concurrent sync limit
    if (this.activeSyncs.size >= this.config.maxConcurrentSyncs) {
      return {
        target,
        success: false,
        timestamp: new Date(),
        duration: 0,
        error: 'Maximum concurrent syncs reached'
      };
    }

    const syncId = uuidv4();
    this.activeSyncs.add(syncId);

    try {
      // Find appropriate sync strategy
      const strategy = this.findBestStrategy(target);
      if (!strategy) {
        throw new Error(`No suitable sync strategy found for target: ${targetId}`);
      }

      // Execute sync with timeout
      const syncPromise = strategy.execute(target, event);
      const timeoutPromise = new Promise<SyncResult>((_, reject) => {
        setTimeout(() => reject(new Error('Sync timeout')), this.config.syncTimeout);
      });

      const result = await Promise.race([syncPromise, timeoutPromise]);

      // Handle retries if enabled and sync failed
      if (!result.success && this.config.enableRetries) {
        return await this.retrySync(target, event, strategy);
      }

      this.emit('sync-completed', { timestamp: new Date(), result });
      return result;
    } finally {
      this.activeSyncs.delete(syncId);
    }
  }

  /**
   * Synchronizes all active targets with an optional temporal event.
   * 
   * @param event - Optional temporal event that triggered the sync
   * @returns Promise that resolves to an array of sync results
   */
  public async syncAllTargets(event?: TemporalEvent): Promise<SyncResult[]> {
    const activeTargets = Array.from(this.targets.values()).filter(target => target.active);
    const results: SyncResult[] = [];

    // Execute syncs in parallel, respecting concurrency limit
    const chunks = this.chunkArray(activeTargets, this.config.maxConcurrentSyncs);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(target => this.syncTarget(target.id, event));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Triggers synchronization based on a sacred time zone.
   * 
   * @param sacredTimeZoneId - The ID of the sacred time zone
   * @param event - Optional temporal event
   * @returns Promise that resolves to sync results
   */
  public async triggerSacredTimeSync(sacredTimeZoneId: string, event?: TemporalEvent): Promise<SyncResult[]> {
    const sacredTimeZone = this.sacredTimeZones.get(sacredTimeZoneId);
    if (!sacredTimeZone) {
      throw new Error(`Sacred time zone not found: ${sacredTimeZoneId}`);
    }

    if (!sacredTimeZone.active) {
      return [];
    }

    // Find targets that should be synced for this sacred time zone
    const relevantTargets = Array.from(this.targets.values()).filter(target => 
      target.active && this.shouldSyncForSacredTime(target, sacredTimeZone)
    );

    const results: SyncResult[] = [];
    for (const target of relevantTargets) {
      const result = await this.syncTarget(target.id, event);
      results.push(result);
    }

    this.emit('sacred-time-trigger', sacredTimeZone);
    return results;
  }

  /**
   * Gets all registered sync targets.
   * 
   * @returns Array of all sync targets
   */
  public getTargets(): SyncTarget[] {
    return Array.from(this.targets.values());
  }

  /**
   * Gets all registered sacred time zones.
   * 
   * @returns Array of all sacred time zones
   */
  public getSacredTimeZones(): SacredTimeZone[] {
    return Array.from(this.sacredTimeZones.values());
  }

  /**
   * Gets the current configuration of the TemporalResonator.
   * 
   * @returns Current configuration object
   */
  public getConfig(): TemporalResonatorConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration of the TemporalResonator.
   * 
   * @param newConfig - Partial configuration to merge
   */
  public updateConfig(newConfig: Partial<TemporalResonatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', { timestamp: new Date(), config: this.config });
  }

  /**
   * Finds the best sync strategy for a given target.
   * 
   * @param target - The sync target
   * @returns The best strategy or undefined if none found
   */
  private findBestStrategy(target: SyncTarget): SyncStrategy | undefined {
    const applicableStrategies = Array.from(this.syncStrategies.values())
      .filter(strategy => strategy.canHandle(target))
      .sort((a, b) => b.priority - a.priority);

    return applicableStrategies[0];
  }

  /**
   * Sets up cron-based scheduling for a target.
   * 
   * @param target - The sync target with schedule configuration
   */
  private setupTargetSchedule(target: SyncTarget): void {
    if (!target.schedule?.cron) {
      return;
    }

    const cronJob = cron.schedule(target.schedule.cron, () => {
      this.syncTarget(target.id);
    }, {
      timezone: target.schedule.timezone || this.config.defaultTimezone
    });

    this.cronJobs.set(target.id, cronJob);
  }

  /**
   * Retries a failed sync operation.
   * 
   * @param target - The sync target
   * @param event - The temporal event
   * @param strategy - The sync strategy
   * @returns Promise that resolves to the final sync result
   */
  private async retrySync(
    target: SyncTarget,
    event: TemporalEvent | undefined,
    strategy: SyncStrategy
  ): Promise<SyncResult> {
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
      
      try {
        const result = await strategy.execute(target, event);
        if (result.success) {
          return result;
        }
      } catch (error) {
        // Continue to next retry attempt
      }
    }

    // All retries failed
    return {
      target,
      success: false,
      timestamp: new Date(),
      duration: 0,
      error: `Sync failed after ${this.config.maxRetries} retry attempts`
    };
  }

  /**
   * Determines if a target should be synced for a specific sacred time zone.
   * 
   * @param target - The sync target
   * @param sacredTimeZone - The sacred time zone
   * @returns True if the target should be synced
   */
  private shouldSyncForSacredTime(target: SyncTarget, sacredTimeZone: SacredTimeZone): boolean {
    // Check if target has specific conditions for this sacred time zone
    if (target.schedule?.conditions) {
      return target.schedule.conditions.some(condition => 
        condition.includes(sacredTimeZone.id) || condition.includes(sacredTimeZone.type)
      );
    }

    // Default behavior: sync all targets for cosmic events
    return sacredTimeZone.type.startsWith('cosmic') || sacredTimeZone.type === 'custom';
  }

  /**
   * Splits an array into chunks of the specified size.
   * 
   * @param array - The array to chunk
   * @param size - The size of each chunk
   * @returns Array of chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
} 