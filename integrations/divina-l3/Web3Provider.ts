import { JsonRpcProvider, Web3Provider as EthersWeb3Provider } from '@ethersproject/providers';
import { Contract, ContractInterface } from 'ethers';
import { DivinaL3Config, DivinaL3Error } from './types';
import { defaultLogger } from '../shared/logger';
import { defaultErrorHandler } from '../shared/errorHandler';

/**
 * Web3 provider for interacting with the Divina-L3 network
 */
export class Web3Provider {
  private provider: JsonRpcProvider;
  private wsProvider: any = null;
  private contractCache: Map<string, Contract> = new Map();
  
  constructor(
    private readonly config: DivinaL3Config,
    private readonly logger = defaultLogger,
    private readonly errorHandler = defaultErrorHandler
  ) {
    this.provider = new JsonRpcProvider({
      url: config.rpcUrl,
      timeout: config.rpcTimeout || 30000,
      throttleLimit: 1,
      throttleCallback: (retryAfter: number, url: string) => {
        this.logger.warn('Rate limit reached', { retryAfter, url });
      },
    });

    // Set the chain ID
    if (config.chainId) {
      this.provider.network.chainId = config.chainId;
    }
  }

  /**
   * Initialize the Web3 provider
   */
  public async initialize(): Promise<void> {
    try {
      // Get the network details
      const network = await this.provider.getNetwork();
      this.logger.info(`Connected to ${network.name} (Chain ID: ${network.chainId})`);

      // Initialize WebSocket connection if configured
      if (this.config.wsUrl) {
        await this.initializeWebSocket();
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, { 
        context: 'Web3Provider.initialize',
        rpcUrl: this.config.rpcUrl 
      });
      throw error;
    }
  }

  /**
   * Initialize WebSocket connection for real-time events
   */
  private async initializeWebSocket(): Promise<void> {
    try {
      // Using dynamic import for WebSocket provider to avoid bundling issues
      const { WebSocketProvider } = await import('@ethersproject/providers');
      
      this.wsProvider = new WebSocketProvider(this.config.wsUrl!);
      
      this.wsProvider.on('error', (error: Error) => {
        this.errorHandler.handleError(error, { context: 'Web3Provider.wsProvider' });
      });
      
      this.wsProvider.on('block', (blockNumber: number) => {
        this.logger.debug('New block', { blockNumber });
      });
      
      this.logger.info('WebSocket connection established', { wsUrl: this.config.wsUrl });
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket connection', { 
        error: error instanceof Error ? error.message : String(error),
        wsUrl: this.config.wsUrl
      });
      // Don't throw, continue with HTTP provider only
    }
  }

  /**
   * Get the underlying provider
   */
  public getProvider(): JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get the WebSocket provider if available
   */
  public getWebSocketProvider(): any | null {
    return this.wsProvider;
  }

  /**
   * Get a contract instance
   */
  public getContract(address: string, abi: ContractInterface): Contract {
    const cacheKey = `${address.toLowerCase()}_${JSON.stringify(abi)}`;
    
    if (this.contractCache.has(cacheKey)) {
      return this.contractCache.get(cacheKey)!;
    }
    
    const provider = this.wsProvider || this.provider;
    const contract = new Contract(address, abi, provider);
    
    this.contractCache.set(cacheKey, contract);
    return contract;
  }

  /**
   * Get the current block number
   */
  public async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  /**
   * Get block details
   */
  public async getBlock(blockHashOrBlockNumber: string | number): Promise<any> {
    return this.provider.getBlock(blockHashOrBlockNumber);
  }

  /**
   * Get transaction details
   */
  public async getTransaction(transactionHash: string): Promise<any> {
    return this.provider.getTransaction(transactionHash);
  }

  /**
   * Get transaction receipt
   */
  public async getTransactionReceipt(transactionHash: string): Promise<any> {
    return this.provider.getTransactionReceipt(transactionHash);
  }

  /**
   * Get the balance of an address
   */
  public async getBalance(address: string, blockTag: string | number = 'latest'): Promise<string> {
    return this.provider.getBalance(address, blockTag);
  }

  /**
   * Call a contract method
   */
  public async call(transaction: {
    to: string;
    data: string;
    from?: string;
    gas?: number | string;
    gasPrice?: number | string;
    value?: number | string;
  }): Promise<string> {
    return this.provider.call(transaction);
  }

  /**
   * Send a raw transaction
   */
  public async sendRawTransaction(signedTransaction: string): Promise<any> {
    return this.provider.sendTransaction(signedTransaction);
  }

  /**
   * Estimate gas for a transaction
   */
  public async estimateGas(transaction: any): Promise<number> {
    return this.provider.estimateGas(transaction);
  }

  /**
   * Get gas price
   */
  public async getGasPrice(): Promise<string> {
    return this.provider.getGasPrice();
  }

  /**
   * Get transaction count for an address
   */
  public async getTransactionCount(address: string, blockTag: string | number = 'latest'): Promise<number> {
    return this.provider.getTransactionCount(address, blockTag);
  }

  /**
   * Wait for a transaction to be mined
   */
  public async waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number
  ): Promise<any> {
    return this.provider.waitForTransaction(
      transactionHash,
      confirmations || this.config.confirmations || 6,
      timeout
    );
  }

  /**
   * Subscribe to new block headers
   */
  public onNewBlock(callback: (blockNumber: number) => void): () => void {
    if (!this.wsProvider) {
      throw new Error('WebSocket provider is not initialized');
    }

    const handler = (blockNumber: number) => callback(blockNumber);
    this.wsProvider.on('block', handler);

    // Return unsubscribe function
    return () => {
      this.wsProvider.off('block', handler);
    };
  }

  /**
   * Subscribe to contract events
   */
  public onContractEvent(
    contractAddress: string,
    abi: ContractInterface,
    eventName: string,
    callback: (event: any) => void
  ): () => void {
    const contract = this.getContract(contractAddress, abi);
    const eventFilter = contract.filters[eventName]();
    
    // Use WebSocket provider if available for real-time events
    const provider = this.wsProvider || this.provider;
    
    provider.on(eventFilter, (event: any) => {
      callback(event);
    });

    // Return unsubscribe function
    return () => {
      provider.off(eventFilter, callback);
    };
  }

  /**
   * Clean up resources
   */
  public async destroy(): Promise<void> {
    if (this.wsProvider) {
      await this.wsProvider.destroy();
      this.wsProvider = null;
    }
  }

  /**
   * Handle errors from the Web3 provider
   */
  private handleProviderError(error: any): never {
    let errorMessage = 'Unknown Web3 error';
    let errorCode = -32603; // Internal JSON-RPC error by default
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
      
      // Handle common JSON-RPC errors
      if (error.code) {
        errorCode = error.code;
      }
      
      // Handle HTTP errors
      if (error.status) {
        errorCode = error.status;
      }
    }
    
    const web3Error: DivinaL3Error = {
      code: errorCode,
      message: errorMessage,
      data: error.data || error.result
    };
    
    this.errorHandler.handleError(new Error(web3Error.message), {
      context: 'Web3Provider',
      code: web3Error.code,
      data: web3Error.data
    });
    
    throw web3Error;
  }
}
