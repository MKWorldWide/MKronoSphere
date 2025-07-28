import { PrimalGenesisConfig, PrimalGenesisAuthResponse, PrimalGenesisError } from './types';
import { defaultLogger } from '../shared/logger';
import { defaultErrorHandler } from '../shared/errorHandler';

/**
 * Authentication module for Primal Genesis Engine
 */
export class PrimalGenesisAuth {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;
  
  constructor(
    private readonly config: PrimalGenesisConfig,
    private readonly logger = defaultLogger,
    private readonly errorHandler = defaultErrorHandler
  ) {}

  /**
   * Initialize the authentication module
   */
  public async initialize(): Promise<void> {
    if (this.config.oauthToken) {
      this.accessToken = this.config.oauthToken;
      this.logger.debug('Using provided OAuth token for authentication');
      return;
    }

    if (!this.config.apiKey) {
      throw new Error('Either apiKey or oauthToken must be provided in the configuration');
    }

    await this.authenticate();
  }

  /**
   * Get the current access token, refreshing if necessary
   */
  public async getAccessToken(): Promise<string> {
    if (!this.accessToken) {
      await this.authenticate();
    } else if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
    
    if (!this.accessToken) {
      throw new Error('Failed to obtain access token');
    }
    
    return this.accessToken;
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Authenticate with the Primal Genesis API
   */
  private async authenticate(): Promise<void> {
    try {
      const response = await this.request<PrimalGenesisAuthResponse>('/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          grant_type: 'client_credentials'
        })
      });

      this.handleAuthResponse(response);
      this.scheduleTokenRefresh();
    } catch (error) {
      this.errorHandler.handleError(error as Error, { context: 'PrimalGenesisAuth.authenticate' });
      throw error;
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      await this.authenticate();
      return;
    }

    try {
      const response = await this.request<PrimalGenesisAuthResponse>('/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken
        })
      });

      this.handleAuthResponse(response);
      this.scheduleTokenRefresh();
    } catch (error) {
      this.logger.warn('Failed to refresh access token, attempting to re-authenticate', { error });
      await this.authenticate();
    }
  }

  /**
   * Handle the authentication response
   */
  private handleAuthResponse(response: PrimalGenesisAuthResponse): void {
    this.accessToken = response.access_token;
    this.tokenExpiry = Date.now() + (response.expires_in * 1000);
    
    if (response.refresh_token) {
      this.refreshToken = response.refresh_token;
    }

    this.logger.debug('Authentication successful', {
      tokenExpiry: new Date(this.tokenExpiry).toISOString(),
      hasRefreshToken: !!response.refresh_token
    });
  }

  /**
   * Schedule a token refresh before it expires
   */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    if (!this.tokenExpiry) {
      return;
    }

    // Refresh the token 5 minutes before it expires
    const refreshTime = this.tokenExpiry - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime <= 0) {
      this.refreshAccessToken().catch(error => {
        this.errorHandler.handleError(error, { context: 'PrimalGenesisAuth.scheduleTokenRefresh' });
      });
      return;
    }

    this.refreshTimeout = setTimeout(async () => {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        this.errorHandler.handleError(error as Error, { context: 'PrimalGenesisAuth.refreshTimeout' });
      }
    }, refreshTime);
  }

  /**
   * Check if the current token is expired or about to expire
   */
  private isTokenExpired(bufferSeconds = 300): boolean {
    if (!this.tokenExpiry) {
      return true;
    }
    return Date.now() >= (this.tokenExpiry - (bufferSeconds * 1000));
  }

  /**
   * Make an authenticated request to the Primal Genesis API
   */
  private async request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const timeout = this.config.timeout || 30000;
    const maxRetries = this.config.maxRetries || 3;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
          headers: {
            ...init.headers,
            'User-Agent': 'MKronoSphere/1.0',
            'Accept': 'application/json',
            'X-Request-Id': crypto.randomUUID()
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorData: PrimalGenesisError | null = null;
          try {
            errorData = await response.json();
          } catch (e) {
            // Ignore JSON parse errors for error responses
          }

          const error = new Error(errorData?.message || `HTTP error ${response.status}: ${response.statusText}`);
          (error as any).status = response.status;
          (error as any).code = errorData?.code;
          (error as any).details = errorData?.details;
          throw error;
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeout}ms`);
        }

        if (attempt < maxRetries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
          this.logger.warn(`Request failed (attempt ${attempt}/${maxRetries}), retrying in ${backoff}ms`, {
            error: error instanceof Error ? error.message : String(error),
            endpoint,
            attempt,
            maxRetries,
            backoff
          });
          
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
      }
    }

    throw lastError || new Error('Request failed with unknown error');
  }
}
