/**
 * MKronoSphere - PulseBroadcaster Module
 * 
 * The PulseBroadcaster is the signal emission system that broadcasts
 * temporal events and synchronization pulses across the Sovereign Network.
 * It serves as the voice of the temporal orchestration system, ensuring
 * that all connected systems receive timely notifications of important
 * events and synchronization triggers.
 * 
 * Key Features:
 * - Multi-channel signal broadcasting (logs, API, WebSocket, sound)
 * - Intelligent signal routing and filtering
 * - Real-time event propagation
 * - Configurable broadcast strategies
 * - Network-wide temporal coordination
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
import { TemporalEvent, PulseSignal, SyncTarget, TemporalEventEmitter } from '../types';

/**
 * Configuration options for the PulseBroadcaster module.
 * Controls broadcasting behavior, channels, and signal processing.
 */
export interface PulseBroadcasterConfig {
  /** Whether to enable automatic broadcasting */
  enableAutoBroadcast: boolean;
  /** Default timezone for broadcast timestamps */
  defaultTimezone: string;
  /** Maximum number of concurrent broadcasts */
  maxConcurrentBroadcasts: number;
  /** Timeout for broadcast operations in milliseconds */
  broadcastTimeout: number;
  /** Whether to enable console logging of broadcasts */
  enableConsoleLogging: boolean;
  /** Whether to enable WebSocket broadcasting */
  enableWebSocketBroadcast: boolean;
  /** WebSocket server configuration */
  websocket?: {
    port: number;
    path: string;
    heartbeatInterval: number;
  };
  /** Whether to enable sound notifications */
  enableSoundNotifications: boolean;
  /** Sound configuration for different event types */
  soundConfig?: {
    human?: string;
    cosmic?: string;
    financial?: string;
    energetic?: string;
    system?: string;
  };
  /** Broadcast channels to enable */
  channels: {
    console: boolean;
    websocket: boolean;
    file: boolean;
    api: boolean;
    sound: boolean;
  };
  /** Signal filtering rules */
  filters?: {
    minPriority?: number;
    requiredTags?: string[];
    excludedTypes?: string[];
  };
}

/**
 * Represents a broadcast channel that can emit signals.
 * Each channel implements specific logic for different types
 * of signal transmission.
 */
export interface BroadcastChannel {
  /** Unique identifier for the channel */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the channel's purpose */
  description: string;
  /** Function that broadcasts a signal through this channel */
  broadcast: (signal: PulseSignal) => Promise<boolean>;
  /** Function that checks if the channel is available */
  isAvailable: () => boolean;
  /** Priority of this channel (higher numbers = higher priority) */
  priority: number;
}

/**
 * Default configuration for the PulseBroadcaster module.
 * Provides sensible defaults while allowing full customization.
 */
export const DEFAULT_PULSE_BROADCASTER_CONFIG: PulseBroadcasterConfig = {
  enableAutoBroadcast: true,
  defaultTimezone: 'UTC',
  maxConcurrentBroadcasts: 10,
  broadcastTimeout: 5000,
  enableConsoleLogging: true,
  enableWebSocketBroadcast: false,
  enableSoundNotifications: false,
  channels: {
    console: true,
    websocket: false,
    file: false,
    api: false,
    sound: false
  },
  filters: {
    minPriority: 1,
    excludedTypes: []
  }
};

/**
 * Built-in broadcast channels for common signal transmission methods.
 * These provide out-of-the-box functionality for typical broadcasting needs.
 */
export const BUILT_IN_BROADCAST_CHANNELS: Record<string, BroadcastChannel> = {
  'console': {
    id: 'console',
    name: 'Console Output',
    description: 'Broadcasts signals to the console with colored output',
    priority: 1,
    isAvailable: () => true,
    broadcast: async (signal: PulseSignal): Promise<boolean> => {
      try {
        const chalk = await import('chalk');
        
        const timestamp = moment(signal.timestamp).format('YYYY-MM-DD HH:mm:ss');
        const eventType = signal.event.type.toUpperCase();
        const eventDescription = signal.event.description;
        const targetCount = signal.targets.length;
        
        // Color coding based on event type
        let colorFn: any = chalk.white;
        switch (signal.event.type) {
          case 'cosmic':
            colorFn = chalk.cyan;
            break;
          case 'energetic':
            colorFn = chalk.magenta;
            break;
          case 'financial':
            colorFn = chalk.green;
            break;
          case 'human':
            colorFn = chalk.blue;
            break;
          case 'system':
            colorFn = chalk.yellow;
            break;
        }
        
        console.log(chalk.gray('╭─ MKronoSphere Pulse ──────────────────────────────────────────'));
        console.log(chalk.gray(`│ Time: ${chalk.white(timestamp)}`));
        console.log(chalk.gray(`│ Type: ${colorFn(eventType)}`));
        console.log(chalk.gray(`│ Event: ${chalk.white(eventDescription)}`));
        console.log(chalk.gray(`│ Targets: ${chalk.white(targetCount.toString())}`));
        console.log(chalk.gray(`│ Status: ${signal.status === 'delivered' ? chalk.green('✓ Delivered') : chalk.yellow('⏳ Pending')}`));
        console.log(chalk.gray('╰─────────────────────────────────────────────────────────────────'));
        
        return true;
      } catch (error) {
        console.error('Console broadcast failed:', error);
        return false;
      }
    }
  },

  'file': {
    id: 'file',
    name: 'File Logging',
    description: 'Writes broadcast signals to log files',
    priority: 2,
    isAvailable: () => true,
    broadcast: async (signal: PulseSignal): Promise<boolean> => {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const logData = {
          timestamp: signal.timestamp.toISOString(),
          pulseId: signal.pulseId,
          event: signal.event,
          targets: signal.targets.map(t => t.id),
          status: signal.status,
          source: 'mkronosphere-pulse'
        };

        const fileName = `pulse-${moment().format('YYYY-MM-DD')}.log`;
        const filePath = path.join(process.cwd(), 'logs', fileName);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Append to log file
        const logLine = JSON.stringify(logData) + '\n';
        await fs.appendFile(filePath, logLine);
        
        return true;
      } catch (error) {
        console.error('File broadcast failed:', error);
        return false;
      }
    }
  },

  'websocket': {
    id: 'websocket',
    name: 'WebSocket Broadcast',
    description: 'Broadcasts signals via WebSocket connections',
    priority: 3,
    isAvailable: () => false, // Will be set to true when WebSocket server is initialized
    broadcast: async (_signal: PulseSignal): Promise<boolean> => {
      // This will be implemented when WebSocket server is set up
      return false;
    }
  },

  'api': {
    id: 'api',
    name: 'API Endpoint',
    description: 'Sends signals to external API endpoints',
    priority: 4,
    isAvailable: () => true,
    broadcast: async (_signal: PulseSignal): Promise<boolean> => {
      try {
        // This would typically send to configured API endpoints
        // For now, we'll just log that it would be sent
        console.log(`[API] Would send pulse to API endpoints`);
        return true;
      } catch (error) {
        console.error('API broadcast failed:', error);
        return false;
      }
    }
  },

  'sound': {
    id: 'sound',
    name: 'Sound Notifications',
    description: 'Plays sound notifications for temporal events',
    priority: 5,
    isAvailable: () => {
      // Check if we're in a Node.js environment that supports sound
      return typeof process !== 'undefined' && process.platform !== 'win32';
    },
    broadcast: async (_signal: PulseSignal): Promise<boolean> => {
      try {
        // Simple console beep for now
        // In a real implementation, this would play actual sound files
        process.stdout.write('\x07'); // Bell character
        return true;
      } catch (error) {
        console.error('Sound broadcast failed:', error);
        return false;
      }
    }
  }
};

/**
 * The PulseBroadcaster class provides comprehensive signal broadcasting
 * capabilities for the MKronoSphere system.
 * 
 * It serves as the communication hub that ensures all connected systems
 * receive timely notifications of temporal events and synchronization
 * triggers, enabling coordinated action across the Sovereign Network.
 */
export class PulseBroadcaster extends EventEmitter implements TemporalEventEmitter {
  private channels: Map<string, BroadcastChannel> = new Map();
  private config: PulseBroadcasterConfig;
  private activeBroadcasts: Set<string> = new Set();
  private websocketServer: any = null;
  private isInitialized = false;

  /**
   * Creates a new PulseBroadcaster instance with the specified configuration.
   * 
   * @param config - Configuration options for the broadcaster
   */
  constructor(config: Partial<PulseBroadcasterConfig> = {}) {
    super();
    this.config = { ...DEFAULT_PULSE_BROADCASTER_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initializes the PulseBroadcaster with the current configuration.
   * Sets up built-in broadcast channels and prepares the system for operation.
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Register built-in broadcast channels
    Object.values(BUILT_IN_BROADCAST_CHANNELS).forEach(channel => {
      this.registerChannel(channel);
    });

    // Set up WebSocket server if enabled
    if (this.config.enableWebSocketBroadcast && this.config.websocket) {
      await this.setupWebSocketServer();
    }

    this.isInitialized = true;
    this.emit('initialized', { timestamp: new Date(), config: this.config });
  }

  /**
   * Registers a broadcast channel for signal transmission.
   * 
   * @param channel - The broadcast channel to register
   */
  public registerChannel(channel: BroadcastChannel): void {
    this.channels.set(channel.id, channel);
    this.emit('channel-registered', { timestamp: new Date(), channel });
  }

  /**
   * Broadcasts a pulse signal through all available channels.
   * This is the primary method for emitting signals across the network.
   * 
   * @param signal - The pulse signal to broadcast
   * @returns Promise that resolves to broadcast results
   */
  public async broadcastSignal(signal: PulseSignal): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const availableChannels = Array.from(this.channels.values())
      .filter(channel => channel.isAvailable())
      .sort((a, b) => b.priority - a.priority);

    // Check if signal should be filtered out
    if (!this.shouldBroadcastSignal(signal)) {
      this.emit('signal-filtered', { timestamp: new Date(), signal, reason: 'filtered' });
      return results;
    }

    // Check concurrent broadcast limit
    if (this.activeBroadcasts.size >= this.config.maxConcurrentBroadcasts) {
      this.emit('broadcast-limited', { timestamp: new Date(), signal, reason: 'concurrency-limit' });
      return results;
    }

    const broadcastId = uuidv4();
    this.activeBroadcasts.add(broadcastId);

    try {
      // Broadcast through all available channels
      const broadcastPromises = availableChannels.map(async (channel) => {
        try {
          const success = await Promise.race([
            channel.broadcast(signal),
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('Broadcast timeout')), this.config.broadcastTimeout)
            )
          ]);
          
          results.set(channel.id, success);
          return { channelId: channel.id, success };
        } catch (error) {
          results.set(channel.id, false);
          return { channelId: channel.id, success: false, error };
        }
      });

      const broadcastResults = await Promise.all(broadcastPromises);
      
      // Update signal status based on results
      const allSuccessful = broadcastResults.every(result => result.success);
      signal.status = allSuccessful ? 'delivered' : 'failed';
      
      this.emit('broadcast-completed', { 
        timestamp: new Date(), 
        signal, 
        results: broadcastResults 
      });

      return results;
    } finally {
      this.activeBroadcasts.delete(broadcastId);
    }
  }

  /**
   * Creates and broadcasts a pulse signal from a temporal event.
   * Convenience method that combines signal creation and broadcasting.
   * 
   * @param event - The temporal event that triggered the pulse
   * @param targets - Array of targets that should receive the pulse
   * @returns Promise that resolves to broadcast results
   */
  public async broadcastEvent(
    event: TemporalEvent,
    targets: SyncTarget[]
  ): Promise<Map<string, boolean>> {
    const signal: PulseSignal = {
      event,
      targets,
      timestamp: new Date(),
      pulseId: uuidv4(),
      status: 'pending'
    };

    return this.broadcastSignal(signal);
  }

  /**
   * Broadcasts a simple message without a specific temporal event.
   * Useful for system notifications and status updates.
   * 
   * @param message - The message to broadcast
   * @param type - The type of message
   * @param targets - Array of targets that should receive the message
   * @returns Promise that resolves to broadcast results
   */
  public async broadcastMessage(
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info',
    targets: SyncTarget[] = []
  ): Promise<Map<string, boolean>> {
    const event: TemporalEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      type: 'system',
      tags: ['broadcast', type],
      metadata: { messageType: type },
      description: message,
      priority: type === 'error' ? 8 : type === 'warning' ? 6 : 4
    };

    return this.broadcastEvent(event, targets);
  }

  /**
   * Gets all registered broadcast channels.
   * 
   * @returns Array of all broadcast channels
   */
  public getChannels(): BroadcastChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Gets the current configuration of the PulseBroadcaster.
   * 
   * @returns Current configuration object
   */
  public getConfig(): PulseBroadcasterConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration of the PulseBroadcaster.
   * 
   * @param newConfig - Partial configuration to merge
   */
  public updateConfig(newConfig: Partial<PulseBroadcasterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', { timestamp: new Date(), config: this.config });
  }

  /**
   * Sets up the WebSocket server for real-time broadcasting.
   * 
   * @returns Promise that resolves when the server is ready
   */
  private async setupWebSocketServer(): Promise<void> {
    try {
      const WebSocket = (await import('ws')).default;
      
      if (!this.config.websocket) {
        return;
      }

      this.websocketServer = new WebSocket.Server({
        port: this.config.websocket.port,
        path: this.config.websocket.path
      });

      // Update the WebSocket channel availability
      const wsChannel = this.channels.get('websocket');
      if (wsChannel) {
        wsChannel.isAvailable = () => true;
      }

      this.websocketServer.on('connection', (ws: any) => {
        this.emit('websocket-client-connected', { timestamp: new Date(), client: ws });
        
        ws.on('close', () => {
          this.emit('websocket-client-disconnected', { timestamp: new Date(), client: ws });
        });
      });

      this.emit('websocket-server-ready', { 
        timestamp: new Date(), 
        port: this.config.websocket.port 
      });
    } catch (error) {
      console.error('Failed to setup WebSocket server:', error);
    }
  }

  /**
   * Determines if a signal should be broadcast based on filtering rules.
   * 
   * @param signal - The pulse signal to evaluate
   * @returns True if the signal should be broadcast
   */
  private shouldBroadcastSignal(signal: PulseSignal): boolean {
    if (!this.config.filters) {
      return true;
    }

    // Check minimum priority
    if (this.config.filters.minPriority && (signal.event.priority || 0) < this.config.filters.minPriority) {
      return false;
    }

    // Check required tags
    if (this.config.filters.requiredTags && this.config.filters.requiredTags.length > 0) {
      const hasRequiredTags = this.config.filters.requiredTags.some(tag => 
        signal.event.tags.includes(tag)
      );
      if (!hasRequiredTags) {
        return false;
      }
    }

    // Check excluded types
    if (this.config.filters.excludedTypes && this.config.filters.excludedTypes.includes(signal.event.type)) {
      return false;
    }

    return true;
  }

  /**
   * Closes the PulseBroadcaster and cleans up resources.
   * 
   * @returns Promise that resolves when cleanup is complete
   */
  public async close(): Promise<void> {
    if (this.websocketServer) {
      this.websocketServer.close();
    }
    
    this.emit('closed', { timestamp: new Date() });
  }
} 