#!/usr/bin/env node

/**
 * MKronoSphere - Command Line Interface
 * 
 * The CLI provides a powerful command-line interface for interacting
 * with the MKronoSphere temporal orchestration system. It enables
 * users to log events, manage sacred time zones, configure sync targets,
 * and monitor the system in real-time.
 * 
 * Usage:
 *   mkronosphere [command] [options]
 * 
 * Commands:
 *   start     - Start the MKronoSphere system
 *   log       - Log a temporal event
 *   sync      - Trigger synchronization
 *   status    - Show system status
 *   config    - Manage configuration
 *   help      - Show help information
 */

import { Command } from 'commander';
import chalk from 'chalk';
import moment from 'moment-timezone';
import MKronoSphere from './index';

/**
 * CLI configuration and state management.
 */
class MKronoSphereCLI {
  private mkronosphere: MKronoSphere | null = null;
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * Sets up all CLI commands and their options.
   */
  private setupCommands(): void {
    this.program
      .name('mkronosphere')
      .description('The sacred timekeeper of the Sovereign Net. A timeline orchestration layer for awakened systems.')
      .version('1.0.0');

    // Start command
    this.program
      .command('start')
      .description('Start the MKronoSphere system')
      .option('-c, --config <path>', 'Path to configuration file')
      .option('--no-console', 'Disable console display')
      .option('--websocket <port>', 'Enable WebSocket server on port')
      .action(async (options) => {
        await this.startSystem(options);
      });

    // Log command
    this.program
      .command('log')
      .description('Log a temporal event')
      .requiredOption('-t, --type <type>', 'Event type (human, cosmic, financial, energetic, system)')
      .requiredOption('-d, --description <description>', 'Event description')
      .option('-m, --metadata <json>', 'Event metadata (JSON string)')
      .option('--tags <tags>', 'Event tags (comma-separated)')
      .option('--timestamp <timestamp>', 'Event timestamp (ISO string)')
      .action(async (options) => {
        await this.logEvent(options);
      });

    // Sync command
    this.program
      .command('sync')
      .description('Trigger synchronization')
      .option('--all', 'Sync all targets')
      .option('--target <id>', 'Sync specific target')
      .option('--sacred-time <id>', 'Trigger sacred time sync')
      .action(async (options) => {
        await this.triggerSync(options);
      });

    // Status command
    this.program
      .command('status')
      .description('Show system status')
      .option('--events', 'Show recent events')
      .option('--targets', 'Show sync targets')
      .option('--sacred-times', 'Show sacred time zones')
      .action(async (options) => {
        await this.showStatus(options);
      });

    // Config command
    this.program
      .command('config')
      .description('Manage configuration')
      .option('--show', 'Show current configuration')
      .option('--set <key=value>', 'Set configuration value')
      .option('--add-target <json>', 'Add sync target (JSON string)')
      .option('--add-sacred-time <json>', 'Add sacred time zone (JSON string)')
      .action(async (options) => {
        await this.manageConfig(options);
      });

    // Help command
    this.program
      .command('help')
      .description('Show detailed help information')
      .action(() => {
        this.showHelp();
      });
  }

  /**
   * Starts the MKronoSphere system.
   * 
   * @param options - Command options
   */
  private async startSystem(options: any): Promise<void> {
    try {
      console.log(chalk.cyan.bold('🌕 MKronoSphere - Sovereign Temporal Orchestrator'));
      console.log(chalk.gray('Initializing sacred timekeeper...\n'));

      // Load configuration if provided
      let config = {};
      if (options.config) {
        try {
          const fs = await import('fs/promises');
          const configData = await fs.readFile(options.config, 'utf8');
          config = JSON.parse(configData);
        } catch (error) {
          console.error(chalk.red('Error loading configuration file:'), error);
          process.exit(1);
        }
      }

      // Override console setting if specified
      if (options.console === false) {
        config = { ...config, console: { enabled: false } };
      }

      // Override WebSocket setting if specified
      if (options.websocket) {
        config = { 
          ...config, 
          websocket: { 
            enabled: true, 
            port: parseInt(options.websocket), 
            path: '/mkronosphere' 
          } 
        };
      }

      // Initialize MKronoSphere
      this.mkronosphere = new MKronoSphere(config);

      // Set up event listeners
      this.mkronosphere.on('initialized', () => {
        console.log(chalk.green('✓ MKronoSphere initialized successfully'));
        console.log(chalk.gray('Press Ctrl+C to stop the system\n'));
      });

      this.mkronosphere.on('error', (error) => {
        console.error(chalk.red('System error:'), error);
      });

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\nShutting down MKronoSphere...'));
        if (this.mkronosphere) {
          await this.mkronosphere.close();
        }
        process.exit(0);
      });

      // Keep the process running
      await new Promise(() => {});

    } catch (error) {
      console.error(chalk.red('Failed to start MKronoSphere:'), error);
      process.exit(1);
    }
  }

  /**
   * Logs a temporal event.
   * 
   * @param options - Command options
   */
  private async logEvent(options: any): Promise<void> {
    try {
      if (!this.mkronosphere) {
        console.error(chalk.red('MKronoSphere system not running. Use "mkronosphere start" first.'));
        process.exit(1);
      }

      const metadata = options.metadata ? JSON.parse(options.metadata) : {};
      const tags = options.tags ? options.tags.split(',').map((tag: string) => tag.trim()) : [];
      const timestamp = options.timestamp ? new Date(options.timestamp) : undefined;

      const event = this.mkronosphere.logEvent(
        options.type,
        options.description,
        metadata,
        tags,
        timestamp
      );

      console.log(chalk.green('✓ Event logged successfully'));
      console.log(chalk.gray(`Event ID: ${event.id}`));
      console.log(chalk.gray(`Timestamp: ${event.timestamp.toISOString()}`));
      console.log(chalk.gray(`Type: ${event.type}`));
      console.log(chalk.gray(`Tags: ${event.tags.join(', ')}`));

    } catch (error) {
      console.error(chalk.red('Failed to log event:'), error);
      process.exit(1);
    }
  }

  /**
   * Triggers synchronization.
   * 
   * @param options - Command options
   */
  private async triggerSync(options: any): Promise<void> {
    try {
      if (!this.mkronosphere) {
        console.error(chalk.red('MKronoSphere system not running. Use "mkronosphere start" first.'));
        process.exit(1);
      }

      if (options.all) {
        console.log(chalk.cyan('Syncing all targets...'));
        const results = await this.mkronosphere.syncAllTargets();
        console.log(chalk.green(`✓ Synced ${results.length} targets`));
        
        results.forEach((result: any) => {
          const status = result.success ? chalk.green('✓') : chalk.red('✗');
          console.log(`  ${status} ${result.target.id}: ${result.success ? 'Success' : result.error}`);
        });

      } else if (options.target) {
        console.log(chalk.cyan(`Syncing target: ${options.target}`));
        const result = await this.mkronosphere.getTemporalResonator().syncTarget(options.target);
        const status = result.success ? chalk.green('✓') : chalk.red('✗');
        console.log(`${status} Sync ${result.success ? 'completed' : 'failed'}: ${result.error || 'Success'}`);

      } else if (options.sacredTime) {
        console.log(chalk.cyan(`Triggering sacred time sync: ${options.sacredTime}`));
        const results = await this.mkronosphere.getTemporalResonator().triggerSacredTimeSync(options.sacredTime);
        console.log(chalk.green(`✓ Sacred time sync completed for ${results.length} targets`));

      } else {
        console.error(chalk.red('Please specify --all, --target, or --sacred-time'));
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('Failed to trigger sync:'), error);
      process.exit(1);
    }
  }

  /**
   * Shows system status.
   * 
   * @param options - Command options
   */
  private async showStatus(options: any): Promise<void> {
    try {
      if (!this.mkronosphere) {
        console.error(chalk.red('MKronoSphere system not running. Use "mkronosphere start" first.'));
        process.exit(1);
      }

      const now = moment();
      console.log(chalk.cyan.bold('╭─ MKronoSphere Status ──────────────────────────────────────────────────'));
      console.log(chalk.cyan(`│ Time: ${chalk.white(now.format('YYYY-MM-DD HH:mm:ss'))} ${chalk.gray(now.format('z'))}`));
      console.log(chalk.cyan(`│ Status: ${chalk.green('● Active')}`));

      if (options.events || !options.targets && !options.sacredTimes) {
        console.log(chalk.cyan('├─ Recent Events ──────────────────────────────────────────────────────────'));
        const events = this.mkronosphere.getEvents({ limit: 10 });
        events.forEach(event => {
          const time = moment(event.timestamp).format('HH:mm:ss');
          const type = event.type.toUpperCase();
          const description = (event.description || '').length > 50 
            ? (event.description || '').substring(0, 47) + '...' 
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

      if (options.targets) {
        console.log(chalk.cyan('├─ Sync Targets ──────────────────────────────────────────────────────────────'));
        const targets = this.mkronosphere.getSyncTargets();
        targets.forEach(target => {
          const status = target.active ? chalk.green('●') : chalk.red('●');
          console.log(chalk.cyan(`│ ${status} ${chalk.white(target.id)} ${chalk.gray(`(${target.type})`)}`));
        });
      }

      if (options.sacredTimes) {
        console.log(chalk.cyan('├─ Sacred Time Zones ──────────────────────────────────────────────────────────'));
        const sacredTimeZones = this.mkronosphere.getSacredTimeZones();
        sacredTimeZones.forEach(stz => {
          const status = stz.active ? chalk.green('●') : chalk.red('●');
          console.log(chalk.cyan(`│ ${status} ${chalk.white(stz.name)} ${chalk.gray(`(${stz.type})`)}`));
        });
      }

      console.log(chalk.cyan('╰─────────────────────────────────────────────────────────────────────────────────'));

    } catch (error) {
      console.error(chalk.red('Failed to show status:'), error);
      process.exit(1);
    }
  }

  /**
   * Manages configuration.
   * 
   * @param options - Command options
   */
  private async manageConfig(options: any): Promise<void> {
    try {
      if (!this.mkronosphere) {
        console.error(chalk.red('MKronoSphere system not running. Use "mkronosphere start" first.'));
        process.exit(1);
      }

      if (options.show) {
        console.log(chalk.cyan.bold('Current Configuration:'));
        console.log(JSON.stringify(this.mkronosphere.getConfig(), null, 2));

      } else if (options.set) {
        const [key, value] = options.set.split('=');
        if (!key || !value) {
          console.error(chalk.red('Invalid format. Use --set key=value'));
          process.exit(1);
        }
        
        // This is a simplified implementation - in a real system, you'd want more sophisticated config management
        console.log(chalk.yellow('Configuration updates not yet implemented in CLI'));

      } else if (options.addTarget) {
        const target = JSON.parse(options.addTarget);
        this.mkronosphere.addSyncTarget(target);
        console.log(chalk.green(`✓ Added sync target: ${target.id}`));

      } else if (options.addSacredTime) {
        const sacredTimeZone = JSON.parse(options.addSacredTime);
        this.mkronosphere.addSacredTimeZone(sacredTimeZone);
        console.log(chalk.green(`✓ Added sacred time zone: ${sacredTimeZone.name}`));

      } else {
        console.error(chalk.red('Please specify --show, --set, --add-target, or --add-sacred-time'));
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('Failed to manage configuration:'), error);
      process.exit(1);
    }
  }

  /**
   * Shows detailed help information.
   */
  private showHelp(): void {
    console.log(chalk.cyan.bold('🌕 MKronoSphere - Sovereign Temporal Orchestrator'));
    console.log(chalk.gray('The sacred timekeeper of the Sovereign Net\n'));

    console.log(chalk.white.bold('Commands:'));
    console.log(chalk.cyan('  start') + chalk.gray('     - Start the MKronoSphere system'));
    console.log(chalk.cyan('  log') + chalk.gray('       - Log a temporal event'));
    console.log(chalk.cyan('  sync') + chalk.gray('      - Trigger synchronization'));
    console.log(chalk.cyan('  status') + chalk.gray('    - Show system status'));
    console.log(chalk.cyan('  config') + chalk.gray('    - Manage configuration'));
    console.log(chalk.cyan('  help') + chalk.gray('      - Show this help information\n'));

    console.log(chalk.white.bold('Examples:'));
    console.log(chalk.gray('  # Start the system'));
    console.log(chalk.white('  mkronosphere start\n'));

    console.log(chalk.gray('  # Log a cosmic event'));
    console.log(chalk.white('  mkronosphere log --type cosmic --description "Full moon ritual" --tags "lunar,sacred"\n'));

    console.log(chalk.gray('  # Sync all targets'));
    console.log(chalk.white('  mkronosphere sync --all\n'));

    console.log(chalk.gray('  # Show system status'));
    console.log(chalk.white('  mkronosphere status --events\n'));

    console.log(chalk.white.bold('Event Types:'));
    console.log(chalk.cyan('  human') + chalk.gray('     - Personal and human-related events'));
    console.log(chalk.cyan('  cosmic') + chalk.gray('     - Astronomical and celestial events'));
    console.log(chalk.cyan('  financial') + chalk.gray(' - Economic and market events'));
    console.log(chalk.cyan('  energetic') + chalk.gray(' - Spiritual and vibrational events'));
    console.log(chalk.cyan('  system') + chalk.gray('    - Technical and system events\n'));

    console.log(chalk.gray('For more information, visit: https://github.com/sovereign-grid/mkronosphere'));
  }

  /**
   * Runs the CLI with the provided arguments.
   * 
   * @param args - Command line arguments
   */
  public run(args: string[]): void {
    this.program.parse(args);
  }
}

// Create and run the CLI
const cli = new MKronoSphereCLI();
cli.run(process.argv); 