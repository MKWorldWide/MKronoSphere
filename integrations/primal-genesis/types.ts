import { IntegrationConfig } from '../shared/types';

export interface PrimalGenesisConfig extends IntegrationConfig {
  /**
   * Base URL of the Primal Genesis API
   * @example 'https://api.primalgenesis.example.com/v1'
   */
  apiUrl: string;

  /**
   * API key for authentication
   */
  apiKey?: string;

  /**
   * OAuth2 token for authentication (alternative to apiKey)
   */
  oauthToken?: string;

  /**
   * Timeout for API requests in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Maximum number of retries for failed requests
   * @default 3
   */
  maxRetries?: number;

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
}

export interface PrimalGenesisEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PrimalGenesisAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface PrimalGenesisError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
