import { IntegrationConfig } from '../shared/types';

export interface DivinaL3Config extends IntegrationConfig {
  /**
   * RPC URL for connecting to the Divina-L3 network
   * @example 'https://rpc.divinal3.example.com'
   */
  rpcUrl: string;

  /**
   * WebSocket URL for real-time events
   * @example 'wss://ws.divinal3.example.com'
   */
  wsUrl?: string;

  /**
   * Chain ID of the Divina-L3 network
   * @default 1234
   */
  chainId?: number;

  /**
   * Private key or mnemonic for signing transactions
   * @warning In production, use environment variables or secure storage
   */
  privateKey?: string;

  /**
   * Address of the Divina-L3 contract
   */
  contractAddress: string;

  /**
   * Timeout for RPC requests in milliseconds
   * @default 30000 (30 seconds)
   */
  rpcTimeout?: number;

  /**
   * Number of block confirmations to wait for
   * @default 6
   */
  confirmations?: number;

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
}

export interface DivinaL3Event {
  address: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
  id: string;
  returnValues: {
    [key: string]: any;
  };
  event: string;
  signature: string;
  raw: {
    data: string;
    topics: string[];
  };
}

export interface DivinaL3Transaction {
  to: string;
  from: string;
  nonce: number;
  gas: number | string;
  gasPrice: number | string;
  data: string;
  value: number | string;
  chainId: number;
}

export interface DivinaL3Block {
  number: number;
  hash: string;
  parentHash: string;
  nonce: string;
  sha3Uncles: string;
  logsBloom: string;
  transactionsRoot: string;
  stateRoot: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  extraData: string;
  size: number;
  gasLimit: number;
  gasUsed: number;
  timestamp: number;
  transactions: string[] | DivinaL3Transaction[];
  uncles: string[];
}

export interface DivinaL3Error {
  code: number;
  message: string;
  data?: any;
}
