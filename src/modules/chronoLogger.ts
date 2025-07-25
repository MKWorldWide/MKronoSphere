/**
 * MKronoSphere - ChronoLogger Module
 * 
 * The ChronoLogger is the core event tracking system that captures,
 * categorizes, and stores temporal events across all dimensions of
 * the Sovereign Network. It provides the foundation for timeline
 * orchestration and synchronization.
 * 
 * Key Features:
 * - Multi-dimensional event tracking (human, cosmic, financial, energetic)
 * - Intelligent tagging and categorization
 * - Metadata enrichment and context preservation
 * - Real-time event emission for system coordination
 * - Persistent storage with temporal indexing
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
import { TemporalEvent, EventType, TemporalEventEmitter } from '../types';

/**
 * Configuration options for the ChronoLogger module.
 * Controls logging behavior, storage, and event processing.
 */
export interface ChronoLoggerConfig {
  /** Whether to enable persistent storage of events */
  enableStorage: boolean;
  /** Storage backend to use (memory, file, database) */
  storageBackend: 'memory' | 'file' | 'database';
  /** Maximum number of events to keep in memory */
  maxMemoryEvents: number;
  /** Whether to emit events in real-time */
  enableRealTimeEmission: boolean;
  /** Default timezone for event timestamps */
  defaultTimezone: string;
  /** Whether to auto-generate tags based on event content */
  autoGenerateTags: boolean;
  /** Custom tag generation rules */
  tagRules?: {
    patterns: Array<{
      regex: RegExp;
      tags: string[];
    }>;
    keywords: Record<string, string[]>;
  };
}

/**
 * Default configuration for the ChronoLogger module.
 * Provides sensible defaults while allowing full customization.
 */
export const DEFAULT_CHRONO_LOGGER_CONFIG: ChronoLoggerConfig = {
  enableStorage: true,
  storageBackend: 'memory',
  maxMemoryEvents: 10000,
  enableRealTimeEmission: true,
  defaultTimezone: 'UTC',
  autoGenerateTags: true,
  tagRules: {
    patterns: [
      {
        regex: /moon|lunar|phase/i,
        tags: ['cosmic', 'lunar', 'astronomical']
      },
      {
        regex: /sun|solar|equinox|solstice/i,
        tags: ['cosmic', 'solar', 'astronomical']
      },
      {
        regex: /commit|push|merge/i,
        tags: ['system', 'git', 'development']
      },
      {
        regex: /ritual|ceremony|sacred/i,
        tags: ['energetic', 'spiritual', 'ritual']
      }
    ],
    keywords: {
      'financial': ['money', 'trade', 'investment', 'market'],
      'energetic': ['energy', 'vibration', 'frequency', 'resonance'],
      'human': ['personal', 'meeting', 'birthday', 'anniversary'],
      'cosmic': ['planet', 'star', 'galaxy', 'universe'],
      'system': ['server', 'database', 'api', 'service']
    }
  }
};

/**
 * The ChronoLogger class provides comprehensive temporal event tracking
 * and logging capabilities for the MKronoSphere system.
 * 
 * It serves as the primary interface for recording events across all
 * dimensions of the Sovereign Network, ensuring proper categorization,
 * tagging, and metadata preservation for downstream processing.
 */
export class ChronoLogger extends EventEmitter implements TemporalEventEmitter {
  private events: TemporalEvent[] = [];
  private config: ChronoLoggerConfig;
  private isInitialized = false;

  /**
   * Creates a new ChronoLogger instance with the specified configuration.
   * 
   * @param config - Configuration options for the logger
   */
  constructor(config: Partial<ChronoLoggerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CHRONO_LOGGER_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initializes the ChronoLogger with the current configuration.
   * Sets up event listeners and prepares the system for operation.
   */
  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Set up event listeners for internal coordination
    this.on('new-event', (event: TemporalEvent) => {
      this.processEvent(event);
    });

    this.isInitialized = true;
    this.emit('initialized', { timestamp: new Date(), config: this.config });
  }

  /**
   * Logs a new temporal event with automatic tagging and metadata enrichment.
   * This is the primary method for recording events in the MKronoSphere system.
   * 
   * @param type - The category of the event
   * @param description - Human-readable description of the event
   * @param metadata - Additional context and data for the event
   * @param tags - Optional custom tags for categorization
   * @param timestamp - Optional specific timestamp (defaults to now)
   * @returns The created temporal event
   */
  public logEvent(
    type: EventType,
    description: string,
    metadata: Record<string, any> = {},
    tags: string[] = [],
    timestamp?: Date
  ): TemporalEvent {
    const event: TemporalEvent = {
      id: uuidv4(),
      timestamp: timestamp || new Date(),
      type,
      tags: this.generateTags(type, description, tags),
      metadata: {
        ...metadata,
        source: 'chronoLogger',
        loggedAt: new Date().toISOString()
      },
      description,
      priority: metadata.priority || 5
    };

    // Store the event
    this.storeEvent(event);

    // Emit real-time event if enabled
    if (this.config.enableRealTimeEmission) {
      this.emit('temporal-event', event);
    }

    // Emit internal event for processing
    this.emit('new-event', event);

    return event;
  }

  /**
   * Logs a human event with automatic context detection.
   * Convenience method for recording personal and human-related events.
   * 
   * @param description - Description of the human event
   * @param metadata - Additional context
   * @param tags - Custom tags
   * @param timestamp - Optional timestamp
   * @returns The created temporal event
   */
  public logHumanEvent(
    description: string,
    metadata: Record<string, any> = {},
    tags: string[] = [],
    timestamp?: Date
  ): TemporalEvent {
    return this.logEvent('human', description, metadata, tags, timestamp);
  }

  /**
   * Logs a cosmic event with astronomical context.
   * Convenience method for recording celestial and astronomical events.
   * 
   * @param description - Description of the cosmic event
   * @param metadata - Astronomical data and context
   * @param tags - Custom tags
   * @param timestamp - Optional timestamp
   * @returns The created temporal event
   */
  public logCosmicEvent(
    description: string,
    metadata: Record<string, any> = {},
    tags: string[] = [],
    timestamp?: Date
  ): TemporalEvent {
    return this.logEvent('cosmic', description, metadata, tags, timestamp);
  }

  /**
   * Logs a financial event with market context.
   * Convenience method for recording financial and economic events.
   * 
   * @param description - Description of the financial event
   * @param metadata - Financial data and context
   * @param tags - Custom tags
   * @param timestamp - Optional timestamp
   * @returns The created temporal event
   */
  public logFinancialEvent(
    description: string,
    metadata: Record<string, any> = {},
    tags: string[] = [],
    timestamp?: Date
  ): TemporalEvent {
    return this.logEvent('financial', description, metadata, tags, timestamp);
  }

  /**
   * Logs an energetic event with vibrational context.
   * Convenience method for recording spiritual and energetic events.
   * 
   * @param description - Description of the energetic event
   * @param metadata - Energetic data and context
   * @param tags - Custom tags
   * @param timestamp - Optional timestamp
   * @returns The created temporal event
   */
  public logEnergeticEvent(
    description: string,
    metadata: Record<string, any> = {},
    tags: string[] = [],
    timestamp?: Date
  ): TemporalEvent {
    return this.logEvent('energetic', description, metadata, tags, timestamp);
  }

  /**
   * Logs a system event with technical context.
   * Convenience method for recording technical and system events.
   * 
   * @param description - Description of the system event
   * @param metadata - Technical data and context
   * @param tags - Custom tags
   * @param timestamp - Optional timestamp
   * @returns The created temporal event
   */
  public logSystemEvent(
    description: string,
    metadata: Record<string, any> = {},
    tags: string[] = [],
    timestamp?: Date
  ): TemporalEvent {
    return this.logEvent('system', description, metadata, tags, timestamp);
  }

  /**
   * Retrieves events based on various filtering criteria.
   * Provides flexible querying capabilities for temporal analysis.
   * 
   * @param filters - Filtering criteria for events
   * @returns Array of matching temporal events
   */
  public getEvents(filters: {
    type?: EventType;
    tags?: string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    source?: string;
  } = {}): TemporalEvent[] {
    let filteredEvents = [...this.events];

    // Apply type filter
    if (filters.type) {
      filteredEvents = filteredEvents.filter(event => event.type === filters.type);
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      filteredEvents = filteredEvents.filter(event =>
        filters.tags!.some(tag => event.tags.includes(tag))
      );
    }

    // Apply date range filter
    if (filters.startDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp <= filters.endDate!);
    }

    // Apply source filter
    if (filters.source) {
      filteredEvents = filteredEvents.filter(event => event.source === filters.source);
    }

    // Apply limit
    if (filters.limit) {
      filteredEvents = filteredEvents.slice(-filters.limit);
    }

    return filteredEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Gets the total count of events in the system.
   * 
   * @returns Number of stored events
   */
  public getEventCount(): number {
    return this.events.length;
  }

  /**
   * Clears all events from memory storage.
   * Use with caution as this operation cannot be undone.
   */
  public clearEvents(): void {
    this.events = [];
    this.emit('events-cleared', { timestamp: new Date(), count: 0 });
  }

  /**
   * Generates intelligent tags for an event based on its content and type.
   * Uses pattern matching and keyword analysis to automatically categorize events.
   * 
   * @param type - The event type
   * @param description - Event description
   * @param customTags - User-provided tags
   * @returns Array of generated tags
   */
  private generateTags(type: EventType, description: string, customTags: string[]): string[] {
    const tags = new Set<string>([type, ...customTags]);

    if (!this.config.autoGenerateTags) {
      return Array.from(tags);
    }

    const lowerDescription = description.toLowerCase();

    // Apply pattern-based tag generation
    if (this.config.tagRules?.patterns) {
      for (const pattern of this.config.tagRules.patterns) {
        if (pattern.regex.test(lowerDescription)) {
          pattern.tags.forEach(tag => tags.add(tag));
        }
      }
    }

    // Apply keyword-based tag generation
    if (this.config.tagRules?.keywords) {
      for (const [category, keywords] of Object.entries(this.config.tagRules.keywords)) {
        if (keywords.some(keyword => lowerDescription.includes(keyword))) {
          tags.add(category);
        }
      }
    }

    // Add temporal context tags
    const now = moment();
    if (now.hour() >= 6 && now.hour() < 12) tags.add('morning');
    else if (now.hour() >= 12 && now.hour() < 18) tags.add('afternoon');
    else if (now.hour() >= 18 && now.hour() < 22) tags.add('evening');
    else tags.add('night');

    return Array.from(tags);
  }

  /**
   * Stores an event in the configured storage backend.
   * Currently supports memory storage with plans for file and database backends.
   * 
   * @param event - The temporal event to store
   */
  private storeEvent(event: TemporalEvent): void {
    if (!this.config.enableStorage) {
      return;
    }

    switch (this.config.storageBackend) {
      case 'memory':
        this.events.push(event);
        
        // Maintain memory limit
        if (this.events.length > this.config.maxMemoryEvents) {
          this.events = this.events.slice(-this.config.maxMemoryEvents);
        }
        break;
      
      case 'file':
        // TODO: Implement file-based storage
        console.warn('File storage not yet implemented, falling back to memory');
        this.events.push(event);
        break;
      
      case 'database':
        // TODO: Implement database storage
        console.warn('Database storage not yet implemented, falling back to memory');
        this.events.push(event);
        break;
    }
  }

  /**
   * Processes an event after it has been logged.
   * Performs additional analysis and triggers any necessary actions.
   * 
   * @param event - The temporal event to process
   */
  private processEvent(event: TemporalEvent): void {
    // Add processing metadata
    event.metadata.processedAt = new Date().toISOString();
    event.metadata.processor = 'chronoLogger';

    // Emit processed event
    this.emit('event-processed', event);
  }

  /**
   * Gets the current configuration of the ChronoLogger.
   * 
   * @returns Current configuration object
   */
  public getConfig(): ChronoLoggerConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration of the ChronoLogger.
   * 
   * @param newConfig - Partial configuration to merge
   */
  public updateConfig(newConfig: Partial<ChronoLoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', { timestamp: new Date(), config: this.config });
  }
} 