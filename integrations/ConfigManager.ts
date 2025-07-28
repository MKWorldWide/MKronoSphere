import { PrimalGenesisConfig } from './primal-genesis/types';
import { DivinaL3Config } from './divina-l3/types';
import { defaultLogger } from './shared/logger';

interface IntegrationConfigs {
  'primal-genesis'?: PrimalGenesisConfig;
  'divina-l3'?: DivinaL3Config;
}

interface EventRoutingRule {
  source: 'primal-genesis' | 'divina-l3' | 'any';
  target: 'primal-genesis' | 'divina-l3' | 'all';
  eventTypes?: string[];
  transform?: (event: any) => any;
}

export class ConfigManager {
  private configs: IntegrationConfigs = {};
  private routingRules: EventRoutingRule[] = [];
  private logger = defaultLogger;

  /**
   * Load configuration from environment variables
   */
  public loadFromEnv(): void {
    this.logger.info('Loading configuration from environment variables');

    // Load Primal Genesis configuration
    if (process.env.PRIMAL_GENESIS_API_URL) {
      this.configs['primal-genesis'] = {
        enabled: process.env.PRIMAL_GENESIS_ENABLED !== 'false',
        name: 'primal-genesis',
        version: process.env.PRIMAL_GENESIS_VERSION || '1.0.0',
        apiUrl: process.env.PRIMAL_GENESIS_API_URL,
        apiKey: process.env.PRIMAL_GENESIS_API_KEY,
        oauthToken: process.env.PRIMAL_GENESIS_OAUTH_TOKEN,
        timeout: process.env.PRIMAL_GENESIS_TIMEOUT 
          ? parseInt(process.env.PRIMAL_GENESIS_TIMEOUT, 10) 
          : 30000,
        maxRetries: process.env.PRIMAL_GENESIS_MAX_RETRIES 
          ? parseInt(process.env.PRIMAL_GENESIS_MAX_RETRIES, 10) 
          : 3,
        debug: process.env.PRIMAL_GENESIS_DEBUG === 'true'
      };
    }

    // Load Divina-L3 configuration
    if (process.env.DIVINA_L3_RPC_URL) {
      this.configs['divina-l3'] = {
        enabled: process.env.DIVINA_L3_ENABLED !== 'false',
        name: 'divina-l3',
        version: process.env.DIVINA_L3_VERSION || '1.0.0',
        rpcUrl: process.env.DIVINA_L3_RPC_URL,
        wsUrl: process.env.DIVINA_L3_WS_URL,
        chainId: process.env.DIVINA_L3_CHAIN_ID 
          ? parseInt(process.env.DIVINA_L3_CHAIN_ID, 10) 
          : 1234,
        privateKey: process.env.DIVINA_L3_PRIVATE_KEY,
        contractAddress: process.env.DIVINA_L3_CONTRACT_ADDRESS || '',
        rpcTimeout: process.env.DIVINA_L3_RPC_TIMEOUT 
          ? parseInt(process.env.DIVINA_L3_RPC_TIMEOUT, 10) 
          : 30000,
        confirmations: process.env.DIVINA_L3_CONFIRMATIONS 
          ? parseInt(process.env.DIVINA_L3_CONFIRMATIONS, 10) 
          : 6,
        debug: process.env.DIVINA_L3_DEBUG === 'true'
      };
    }

    // Load routing rules from environment
    this.loadRoutingRulesFromEnv();
  }

  /**
   * Load routing rules from environment variables
   */
  private loadRoutingRulesFromEnv(): void {
    // Example format: SOURCE:TARGET:EVENT_TYPE,EVENT_TYPE2
    const rulesEnv = process.env.INTEGRATION_ROUTING_RULES;
    if (!rulesEnv) {
      return;
    }

    const ruleStrings = rulesEnv.split(';').filter(Boolean);
    
    for (const ruleStr of ruleStrings) {
      try {
        const [source, target, eventTypesStr] = ruleStr.split(':');
        
        if (!source || !target) {
          this.logger.warn('Invalid routing rule format', { rule: ruleStr });
          continue;
        }

        const eventTypes = eventTypesStr ? eventTypesStr.split(',') : undefined;
        
        this.addRoutingRule({
          source: source as 'primal-genesis' | 'divina-l3' | 'any',
          target: target as 'primal-genesis' | 'divina-l3' | 'all',
          eventTypes
        });
      } catch (error) {
        this.logger.error('Error parsing routing rule', { 
          rule: ruleStr, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
  }

  /**
   * Add a routing rule
   */
  public addRoutingRule(rule: EventRoutingRule): void {
    this.routingRules.push(rule);
    this.logger.debug('Added routing rule', { rule });
  }

  /**
   * Get configuration for an integration
   */
  public getConfig<T extends keyof IntegrationConfigs>(
    integration: T
  ): IntegrationConfigs[T] | undefined {
    return this.configs[integration];
  }

  /**
   * Get all configurations
   */
  public getAllConfigs(): IntegrationConfigs {
    return { ...this.configs };
  }

  /**
   * Get all routing rules
   */
  public getRoutingRules(): EventRoutingRule[] {
    return [...this.routingRules];
  }

  /**
   * Validate the configuration
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate Primal Genesis configuration
    const pgConfig = this.configs['primal-genesis'];
    if (pgConfig?.enabled) {
      if (!pgConfig.apiUrl) {
        errors.push('Primal Genesis API URL is required');
      }
      if (!pgConfig.apiKey && !pgConfig.oauthToken) {
        errors.push('Either Primal Genesis API key or OAuth token is required');
      }
    }

    // Validate Divina-L3 configuration
    const dl3Config = this.configs['divina-l3'];
    if (dl3Config?.enabled) {
      if (!dl3Config.rpcUrl) {
        errors.push('Divina-L3 RPC URL is required');
      }
      if (!dl3Config.contractAddress) {
        errors.push('Divina-L3 contract address is required');
      }
    }

    // Validate routing rules
    for (const rule of this.routingRules) {
      if (rule.source !== 'any' && !this.configs[rule.source]?.enabled) {
        errors.push(`Routing rule references disabled or invalid source: ${rule.source}`);
      }
      
      if (rule.target !== 'all' && !this.configs[rule.target]?.enabled) {
        errors.push(`Routing rule references disabled or invalid target: ${rule.target}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a .env.example file
   */
  public generateEnvExample(): string {
    const lines = [
      '# Primal Genesis Configuration',
      'PRIMAL_GENESIS_ENABLED=true',
      'PRIMAL_GENESIS_API_URL=',
      'PRIMAL_GENESIS_API_KEY=',
      'PRIMAL_GENESIS_OAUTH_TOKEN=',
      'PRIMAL_GENESIS_TIMEOUT=30000',
      'PRIMAL_GENESIS_MAX_RETRIES=3',
      'PRIMAL_GENESIS_DEBUG=false',
      'PRIMAL_GENESIS_VERSION=1.0.0',
      '',
      '# Divina-L3 Configuration',
      'DIVINA_L3_ENABLED=true',
      'DIVINA_L3_RPC_URL=',
      'DIVINA_L3_WS_URL=',
      'DIVINA_L3_CHAIN_ID=',
      'DIVINA_L3_PRIVATE_KEY=',
      'DIVINA_L3_CONTRACT_ADDRESS=',
      'DIVINA_L3_RPC_TIMEOUT=30000',
      'DIVINA_L3_CONFIRMATIONS=6',
      'DIVINA_L3_DEBUG=false',
      'DIVINA_L3_VERSION=1.0.0',
      '',
      '# Routing Rules',
      '# Format: SOURCE:TARGET:EVENT_TYPE1,EVENT_TYPE2',
      '# Example: primal-genesis:divina-l3:user.created,order.completed',
      'INTEGRATION_ROUTING_RULES='
    ];

    return lines.join('\n');
  }
}
