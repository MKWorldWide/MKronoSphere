import { BaseIntegration } from '../BaseIntegration';
import { createMockLogger, expectAsyncError } from '../../../__tests__/test-utils';
import { IntegrationConfig, IntegrationEvent, Logger } from '../types';

// Define test-specific types
interface TestConfig extends IntegrationConfig {
  apiUrl: string;
  apiKey: string;
  timeout?: number;
  enabled: boolean;
}

type TestEvent = {
  id: string;
  type: string;
  data: any;
};

class TestIntegration extends BaseIntegration<TestConfig, TestEvent> {
  private isConnected: boolean = false;
  
  constructor(config: TestConfig, logger?: Logger) {
    super(config, logger);
  }

  async setup(): Promise<void> {
    // Implementation for setup
  }

  async onStart(): Promise<void> {
    // Implementation for onStart
  }

  async onStop(): Promise<void> {
    // Implementation for onStop
  }

  async onSendEvent(event: IntegrationEvent<TestEvent>): Promise<void> {
    // Implementation for onSendEvent
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      throw new Error('Already connected');
    }
    this.logger.info('Connecting to test integration');
    await new Promise(resolve => setTimeout(resolve, 10));
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }
    this.logger.info('Disconnecting from test integration');
    this.isConnected = false;
  }

  async testMethod(): Promise<string> {
    await this.ensureConnected();
    return 'test-result';
  }

  async emitTestEvent(event: TestEvent): Promise<void> {
    const integrationEvent: IntegrationEvent<TestEvent> = {
      id: 'test-id',
      timestamp: new Date(),
      source: 'test',
      type: 'test-event',
      data: event,
      metadata: {
        id: 'test-id',
        timestamp: new Date(),
        source: 'test',
        type: 'test-event'
      }
    };
    this.emitEvent(integrationEvent);
  }

  // Helper method for testing
  async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }
}

describe('BaseIntegration', () => {
  let integration: TestIntegration;
  let mockLogger: ReturnType<typeof createMockLogger>;
  const testConfig: TestConfig = {
    apiUrl: 'https://api.example.com',
    apiKey: 'test-api-key',
    name: 'test-integration',
    version: '1.0.0',
    enabled: true
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    integration = new TestIntegration(testConfig, mockLogger);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided config and logger', () => {
      expect(integration['config']).toEqual(testConfig);
      expect(integration['logger']).toBe(mockLogger);
    });

    it('should use default logger if none provided', () => {
      const defaultIntegration = new TestIntegration(testConfig);
      expect(defaultIntegration['logger']).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await integration.connect();
      expect(mockLogger.info).toHaveBeenCalledWith('Connecting to test integration');
    });

    it('should throw if already connected', async () => {
      await integration.connect();
      await expect(integration.connect()).rejects.toThrow('Already connected');
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await integration.connect();
      await integration.disconnect();
      expect(mockLogger.info).toHaveBeenCalledWith('Disconnecting from test integration');
    });

    it('should throw if not connected', async () => {
      await expect(integration.disconnect()).rejects.toThrow('Not connected');
    });
  });

  describe('ensureConnected', () => {
    it('should connect if not already connected', async () => {
      await integration.ensureConnected();
      expect(mockLogger.info).toHaveBeenCalledWith('Connecting to test integration');
    });

    it('should not connect if already connected', async () => {
      await integration.connect();
      jest.clearMocks();
      await integration.ensureConnected();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('should register and emit events', async () => {
      const eventHandler = jest.fn();
      integration.onEvent(eventHandler);
      
      const testEvent = {
        id: '123',
        type: 'test',
        data: { key: 'value' }
      };
      
      await integration.emitTestEvent(testEvent);
      
      expect(eventHandler).toHaveBeenCalledWith(expect.objectContaining({
        data: testEvent
      }));
    });

    it('should handle errors in event handlers', async () => {
      const error = new Error('Event handler error');
      const errorHandler = jest.fn();
      
      integration.onEvent(() => { throw error; });
      integration.onEvent(errorHandler); // This should still be called
      
      await integration.emitTestEvent({ id: '123', type: 'test', data: {} });
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in event handler',
        expect.any(Object)
      );
      expect(errorHandler).toHaveBeenCalled();
    });
  });
});
