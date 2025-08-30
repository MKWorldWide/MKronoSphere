import { BaseIntegration } from '../BaseIntegration';
import { createMockLogger, expectAsyncError } from '../../../../__tests__/test-utils';
import { IntegrationConfig, IntegrationEvent } from '../types';

describe('BaseIntegration', () => {
  // Define a test config type that extends IntegrationConfig
  interface TestConfig extends IntegrationConfig {
    apiUrl: string;
    apiKey: string;
    timeout?: number;
  }

  // Create a test event type
  type TestEvent = {
    id: string;
    type: string;
    data: any;
  };

  // Test implementation of BaseIntegration
  class TestIntegration extends BaseIntegration<TestConfig, TestEvent> {
    private isConnected: boolean = false;

    constructor(config: TestConfig, logger?: any) {
      super(config, logger);
    }

    async connect(): Promise<void> {
      if (this.isConnected) {
        throw new Error('Already connected');
      }
      this.logger.info('Connecting to test integration');
      // Simulate connection delay
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
        timestamp: new Date(),
        source: 'test',
        data: event,
        metadata: {}
      };
      this.emitEvent(integrationEvent);
    }
  }

  let integration: TestIntegration;
  let mockLogger: ReturnType<typeof createMockLogger>;
  const testConfig: TestConfig = {
    apiUrl: 'https://api.example.com',
    apiKey: 'test-api-key',
    name: 'test-integration',
    version: '1.0.0'
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
      await integration['ensureConnected']();
      expect(mockLogger.info).toHaveBeenCalledWith('Connecting to test integration');
    });

    it('should not connect if already connected', async () => {
      await integration.connect();
      jest.clearAllMocks();
      await integration['ensureConnected']();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('withConnection', () => {
    it('should execute the callback with a connection', async () => {
      const callback = jest.fn().mockResolvedValue('test-result');
      const result = await integration['withConnection'](callback);
      
      expect(callback).toHaveBeenCalled();
      expect(result).toBe('test-result');
      expect(mockLogger.info).toHaveBeenCalledWith('Connecting to test integration');
    });

    it('should handle errors in the callback', async () => {
      const error = new Error('Test error');
      const callback = jest.fn().mockRejectedValue(error);
      
      await expect(integration['withConnection'](callback)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should ensure connection before executing callback', async () => {
      const callback = jest.fn().mockResolvedValue('test-result');
      await integration['withConnection'](callback);
      
      expect(mockLogger.info).toHaveBeenCalledWith('Connecting to test integration');
      expect(callback).toHaveBeenCalled();
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

  describe('error handling', () => {
    it('should use the provided error handler', async () => {
      const mockErrorHandler = {
        handleError: jest.fn()
      };
      
      integration['errorHandler'] = mockErrorHandler as any;
      
      const error = new Error('Test error');
      try {
        await integration['withConnection'](() => { throw error; });
      } catch (e) {
        // Expected
      }
      
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: expect.objectContaining({
            method: 'withConnection'
          })
        })
      );
    });
  });
});
