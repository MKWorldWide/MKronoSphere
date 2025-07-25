/**
 * MKronoSphere - Sacred Time Zones Module
 * 
 * The Sacred Time Zones module manages astronomical calculations and
 * sacred temporal markers that have special significance in the Sovereign
 * Network. It provides precise calculations for cosmic events and
 * enables temporal alignment with natural cycles.
 * 
 * Key Features:
 * - Astronomical calculations (moon phases, equinoxes, solstices)
 * - Geographic sunrise/sunset calculations
 * - Custom sacred time zone definitions
 * - Real-time cosmic event detection
 * - Temporal alignment with natural cycles
 */

import { EventEmitter } from 'events';

import * as SunCalc from 'suncalc';
import { SacredTimeZone } from '../types';

/**
 * Configuration options for the Sacred Time Zones module.
 * Controls astronomical calculations and sacred time zone behavior.
 */
export interface SacredTimeZonesConfig {
  /** Default geographic location for calculations */
  defaultLocation: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  /** Whether to enable automatic cosmic event detection */
  enableAutoDetection: boolean;
  /** Interval for checking cosmic events (in milliseconds) */
  detectionInterval: number;
  /** Whether to emit events for cosmic occurrences */
  enableEventEmission: boolean;
  /** Precision for astronomical calculations (in minutes) */
  calculationPrecision: number;
  /** Custom astronomical calculation functions */
  customCalculators?: Record<string, AstronomicalCalculator>;
}

/**
 * Represents an astronomical calculator function.
 * Each calculator implements specific logic for different types
 * of cosmic calculations.
 */
export interface AstronomicalCalculator {
  /** Unique identifier for the calculator */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the calculator's purpose */
  description: string;
  /** Function that performs the astronomical calculation */
  calculate: (date: Date, location?: GeographicLocation) => AstronomicalResult;
  /** Function that checks if the calculator is applicable */
  isApplicable: (sacredTimeZone: SacredTimeZone) => boolean;
}

/**
 * Represents a geographic location for astronomical calculations.
 */
export interface GeographicLocation {
  latitude: number;
  longitude: number;
  timezone: string;
  elevation?: number;
}

/**
 * Represents the result of an astronomical calculation.
 */
export interface AstronomicalResult {
  /** The calculated event time */
  time: Date;
  /** The type of astronomical event */
  type: string;
  /** Additional data about the calculation */
  data: Record<string, any>;
  /** Whether this is a significant event */
  isSignificant: boolean;
  /** Confidence level of the calculation (0-1) */
  confidence: number;
}

/**
 * Default configuration for the Sacred Time Zones module.
 * Provides sensible defaults while allowing full customization.
 */
export const DEFAULT_SACRED_TIME_ZONES_CONFIG: SacredTimeZonesConfig = {
  defaultLocation: {
    latitude: 40.7128, // New York City
    longitude: -74.0060,
    timezone: 'America/New_York'
  },
  enableAutoDetection: true,
  detectionInterval: 60000, // 1 minute
  enableEventEmission: true,
  calculationPrecision: 5 // 5 minutes
};

/**
 * Built-in astronomical calculators for common cosmic events.
 * These provide out-of-the-box functionality for typical sacred time calculations.
 */
export const BUILT_IN_ASTRONOMICAL_CALCULATORS: Record<string, AstronomicalCalculator> = {
  'full-moon': {
    id: 'full-moon',
    name: 'Full Moon Calculator',
    description: 'Calculates full moon phases and lunar events',
    isApplicable: (sacredTimeZone: SacredTimeZone) => sacredTimeZone.type === 'full-moon',
    calculate: (date: Date, _location?: GeographicLocation): AstronomicalResult => {
      // Simple lunar phase calculation
      // In a real implementation, this would use more precise astronomical algorithms
      const lunarCycle = 29.53058867; // days
      const knownFullMoon = new Date('2000-01-06T18:24:00Z'); // Known full moon reference
      
      const daysSinceKnown = (date.getTime() - knownFullMoon.getTime()) / (1000 * 60 * 60 * 24);
      const phase = ((daysSinceKnown % lunarCycle) / lunarCycle) * 100;
      
      // Full moon occurs when phase is close to 100%
      const isFullMoon = Math.abs(phase - 100) < 5;
      
      return {
        time: date,
        type: 'full-moon',
        data: {
          phase,
          isFullMoon,
          lunarCycle,
          daysSinceKnown
        },
        isSignificant: isFullMoon,
        confidence: isFullMoon ? 0.9 : 0.1
      };
    }
  },

  'equinox': {
    id: 'equinox',
    name: 'Equinox Calculator',
    description: 'Calculates spring and autumn equinoxes',
    isApplicable: (sacredTimeZone: SacredTimeZone) => sacredTimeZone.type === 'equinox',
    calculate: (date: Date, _location?: GeographicLocation): AstronomicalResult => {
      const year = date.getFullYear();
      
      // Approximate equinox dates (these would be more precise in a real implementation)
      const springEquinox = new Date(year, 2, 20); // March 20-21
      const autumnEquinox = new Date(year, 8, 22); // September 22-23
      
      const daysToSpring = Math.abs(date.getTime() - springEquinox.getTime()) / (1000 * 60 * 60 * 24);
      const daysToAutumn = Math.abs(date.getTime() - autumnEquinox.getTime()) / (1000 * 60 * 60 * 24);
      
      const isSpringEquinox = daysToSpring < 1;
      const isAutumnEquinox = daysToAutumn < 1;
      const isEquinox = isSpringEquinox || isAutumnEquinox;
      
      return {
        time: date,
        type: isSpringEquinox ? 'spring-equinox' : isAutumnEquinox ? 'autumn-equinox' : 'equinox',
        data: {
          isSpringEquinox,
          isAutumnEquinox,
          daysToSpring,
          daysToAutumn,
          year
        },
        isSignificant: isEquinox,
        confidence: isEquinox ? 0.8 : 0.1
      };
    }
  },

  'solstice': {
    id: 'solstice',
    name: 'Solstice Calculator',
    description: 'Calculates summer and winter solstices',
    isApplicable: (sacredTimeZone: SacredTimeZone) => sacredTimeZone.type === 'solstice',
    calculate: (date: Date, _location?: GeographicLocation): AstronomicalResult => {
      const year = date.getFullYear();
      
      // Approximate solstice dates
      const summerSolstice = new Date(year, 5, 21); // June 21-22
      const winterSolstice = new Date(year, 11, 21); // December 21-22
      
      const daysToSummer = Math.abs(date.getTime() - summerSolstice.getTime()) / (1000 * 60 * 60 * 24);
      const daysToWinter = Math.abs(date.getTime() - winterSolstice.getTime()) / (1000 * 60 * 60 * 24);
      
      const isSummerSolstice = daysToSummer < 1;
      const isWinterSolstice = daysToWinter < 1;
      const isSolstice = isSummerSolstice || isWinterSolstice;
      
      return {
        time: date,
        type: isSummerSolstice ? 'summer-solstice' : isWinterSolstice ? 'winter-solstice' : 'solstice',
        data: {
          isSummerSolstice,
          isWinterSolstice,
          daysToSummer,
          daysToWinter,
          year
        },
        isSignificant: isSolstice,
        confidence: isSolstice ? 0.8 : 0.1
      };
    }
  },

  'sunrise': {
    id: 'sunrise',
    name: 'Sunrise Calculator',
    description: 'Calculates daily sunrise times based on geographic location',
    isApplicable: (sacredTimeZone: SacredTimeZone) => sacredTimeZone.type === 'sunrise',
    calculate: (date: Date, location?: GeographicLocation): AstronomicalResult => {
      if (!location) {
        return {
          time: date,
          type: 'sunrise',
          data: { error: 'No location provided' },
          isSignificant: false,
          confidence: 0
        };
      }
      
      try {
        const times = SunCalc.getTimes(date, location.latitude, location.longitude);
        const sunrise = times.sunrise;
        
        // Check if current time is close to sunrise
        const timeDiff = Math.abs(date.getTime() - sunrise.getTime()) / (1000 * 60); // minutes
        const isNearSunrise = timeDiff < 30; // Within 30 minutes
        
        return {
          time: sunrise,
          type: 'sunrise',
          data: {
            sunrise,
            timeDiff,
            isNearSunrise,
            location
          },
          isSignificant: isNearSunrise,
          confidence: isNearSunrise ? 0.9 : 0.1
        };
      } catch (error) {
        return {
          time: date,
          type: 'sunrise',
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          isSignificant: false,
          confidence: 0
        };
      }
    }
  },

  'sunset': {
    id: 'sunset',
    name: 'Sunset Calculator',
    description: 'Calculates daily sunset times based on geographic location',
    isApplicable: (sacredTimeZone: SacredTimeZone) => sacredTimeZone.type === 'sunset',
    calculate: (date: Date, location?: GeographicLocation): AstronomicalResult => {
      if (!location) {
        return {
          time: date,
          type: 'sunset',
          data: { error: 'No location provided' },
          isSignificant: false,
          confidence: 0
        };
      }
      
      try {
        const times = SunCalc.getTimes(date, location.latitude, location.longitude);
        const sunset = times.sunset;
        
        // Check if current time is close to sunset
        const timeDiff = Math.abs(date.getTime() - sunset.getTime()) / (1000 * 60); // minutes
        const isNearSunset = timeDiff < 30; // Within 30 minutes
        
        return {
          time: sunset,
          type: 'sunset',
          data: {
            sunset,
            timeDiff,
            isNearSunset,
            location
          },
          isSignificant: isNearSunset,
          confidence: isNearSunset ? 0.9 : 0.1
        };
      } catch (error) {
        return {
          time: date,
          type: 'sunset',
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          isSignificant: false,
          confidence: 0
        };
      }
    }
  }
};

/**
 * The Sacred Time Zones class provides comprehensive astronomical
 * calculation capabilities for the MKronoSphere system.
 * 
 * It serves as the cosmic alignment engine that enables temporal
 * synchronization with natural cycles and astronomical events,
 * ensuring that the Sovereign Network operates in harmony with
 * the greater cosmic rhythms.
 */
export class SacredTimeZones extends EventEmitter {
  private sacredTimeZones: Map<string, SacredTimeZone> = new Map();
  private config: SacredTimeZonesConfig;
  private calculators: Map<string, AstronomicalCalculator> = new Map();
  private detectionInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * Creates a new Sacred Time Zones instance with the specified configuration.
   * 
   * @param config - Configuration options for the sacred time zones
   */
  constructor(config: Partial<SacredTimeZonesConfig> = {}) {
    super();
    this.config = { ...DEFAULT_SACRED_TIME_ZONES_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initializes the Sacred Time Zones with the current configuration.
   * Sets up built-in astronomical calculators and prepares the system for operation.
   */
  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Register built-in astronomical calculators
    Object.values(BUILT_IN_ASTRONOMICAL_CALCULATORS).forEach(calculator => {
      this.registerCalculator(calculator);
    });

    // Register custom calculators if provided
    if (this.config.customCalculators) {
      Object.values(this.config.customCalculators).forEach(calculator => {
        this.registerCalculator(calculator);
      });
    }

    // Start automatic detection if enabled
    if (this.config.enableAutoDetection) {
      this.startAutoDetection();
    }

    this.isInitialized = true;
    this.emit('initialized', { timestamp: new Date(), config: this.config });
  }

  /**
   * Registers an astronomical calculator for cosmic calculations.
   * 
   * @param calculator - The astronomical calculator to register
   */
  public registerCalculator(calculator: AstronomicalCalculator): void {
    this.calculators.set(calculator.id, calculator);
    this.emit('calculator-registered', { timestamp: new Date(), calculator });
  }

  /**
   * Adds a sacred time zone for monitoring and calculation.
   * 
   * @param sacredTimeZone - The sacred time zone to add
   */
  public addSacredTimeZone(sacredTimeZone: SacredTimeZone): void {
    this.sacredTimeZones.set(sacredTimeZone.id, sacredTimeZone);
    this.emit('sacred-time-zone-added', { timestamp: new Date(), sacredTimeZone });
  }

  /**
   * Removes a sacred time zone from monitoring.
   * 
   * @param sacredTimeZoneId - The ID of the sacred time zone to remove
   */
  public removeSacredTimeZone(sacredTimeZoneId: string): void {
    const sacredTimeZone = this.sacredTimeZones.get(sacredTimeZoneId);
    if (sacredTimeZone) {
      this.sacredTimeZones.delete(sacredTimeZoneId);
      this.emit('sacred-time-zone-removed', { timestamp: new Date(), sacredTimeZone });
    }
  }

  /**
   * Calculates astronomical events for a specific sacred time zone.
   * 
   * @param sacredTimeZoneId - The ID of the sacred time zone
   * @param date - Optional date for calculation (defaults to now)
   * @returns Promise that resolves to the astronomical result
   */
  public async calculateSacredTime(
    sacredTimeZoneId: string,
    date: Date = new Date()
  ): Promise<AstronomicalResult | null> {
    const sacredTimeZone = this.sacredTimeZones.get(sacredTimeZoneId);
    if (!sacredTimeZone || !sacredTimeZone.active) {
      return null;
    }

    // Find appropriate calculator
    const calculator = this.findBestCalculator(sacredTimeZone);
    if (!calculator) {
      return null;
    }

    // Use sacred time zone location or default location
    const location = sacredTimeZone.location || this.config.defaultLocation;
    
    try {
      const result = calculator.calculate(date, location);
      
      // Add sacred time zone context to result
      result.data.sacredTimeZone = sacredTimeZone.id;
      result.data.sacredTimeZoneName = sacredTimeZone.name;
      
      this.emit('calculation-completed', { timestamp: new Date(), result, sacredTimeZone });
      return result;
    } catch (error) {
      this.emit('calculation-error', { timestamp: new Date(), error, sacredTimeZone });
      return null;
    }
  }

  /**
   * Calculates astronomical events for all active sacred time zones.
   * 
   * @param date - Optional date for calculation (defaults to now)
   * @returns Promise that resolves to an array of astronomical results
   */
  public async calculateAllSacredTimes(date: Date = new Date()): Promise<AstronomicalResult[]> {
    const activeSacredTimeZones = Array.from(this.sacredTimeZones.values())
      .filter(sacredTimeZone => sacredTimeZone.active);

    const results: AstronomicalResult[] = [];
    
    for (const sacredTimeZone of activeSacredTimeZones) {
      const result = await this.calculateSacredTime(sacredTimeZone.id, date);
      if (result) {
        results.push(result);
      }
    }

    return results;
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
   * Gets the next significant astronomical event for a sacred time zone.
   * 
   * @param sacredTimeZoneId - The ID of the sacred time zone
   * @param fromDate - Optional start date (defaults to now)
   * @param daysAhead - Number of days to look ahead (defaults to 30)
   * @returns Promise that resolves to the next significant event
   */
  public async getNextSignificantEvent(
    sacredTimeZoneId: string,
    fromDate: Date = new Date(),
    daysAhead: number = 30
  ): Promise<AstronomicalResult | null> {
    const sacredTimeZone = this.sacredTimeZones.get(sacredTimeZoneId);
    if (!sacredTimeZone || !sacredTimeZone.active) {
      return null;
    }

    const calculator = this.findBestCalculator(sacredTimeZone);
    if (!calculator) {
      return null;
    }

    const location = sacredTimeZone.location || this.config.defaultLocation;
    const endDate = new Date(fromDate.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    // Check every hour for the next significant event
    for (let checkDate = new Date(fromDate); checkDate <= endDate; checkDate.setHours(checkDate.getHours() + 1)) {
      const result = calculator.calculate(checkDate, location);
      if (result.isSignificant && result.confidence > 0.7) {
        result.data.sacredTimeZone = sacredTimeZone.id;
        result.data.sacredTimeZoneName = sacredTimeZone.name;
        return result;
      }
    }

    return null;
  }

  /**
   * Gets the current configuration of the Sacred Time Zones.
   * 
   * @returns Current configuration object
   */
  public getConfig(): SacredTimeZonesConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration of the Sacred Time Zones.
   * 
   * @param newConfig - Partial configuration to merge
   */
  public updateConfig(newConfig: Partial<SacredTimeZonesConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', { timestamp: new Date(), config: this.config });
  }

  /**
   * Starts automatic detection of cosmic events.
   * 
   * @returns Promise that resolves when detection is started
   */
  public startAutoDetection(): Promise<void> {
    if (this.detectionInterval) {
      return Promise.resolve();
    }

    this.detectionInterval = setInterval(async () => {
      const results = await this.calculateAllSacredTimes();
      
      for (const result of results) {
        if (result.isSignificant && this.config.enableEventEmission) {
          this.emit('significant-cosmic-event', { timestamp: new Date(), result });
        }
      }
    }, this.config.detectionInterval);

    this.emit('auto-detection-started', { timestamp: new Date() });
    return Promise.resolve();
  }

  /**
   * Stops automatic detection of cosmic events.
   * 
   * @returns Promise that resolves when detection is stopped
   */
  public stopAutoDetection(): Promise<void> {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
      this.emit('auto-detection-stopped', { timestamp: new Date() });
    }
    return Promise.resolve();
  }

  /**
   * Finds the best astronomical calculator for a sacred time zone.
   * 
   * @param sacredTimeZone - The sacred time zone
   * @returns The best calculator or undefined if none found
   */
  private findBestCalculator(sacredTimeZone: SacredTimeZone): AstronomicalCalculator | undefined {
    const applicableCalculators = Array.from(this.calculators.values())
      .filter(calculator => calculator.isApplicable(sacredTimeZone));

    return applicableCalculators[0];
  }
} 