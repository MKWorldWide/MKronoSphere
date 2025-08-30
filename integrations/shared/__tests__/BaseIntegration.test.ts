import { BaseIntegration } from '../BaseIntegration';
import { createMockLogger, expectAsyncError } from '../../../../__tests__/test-utils';

describe('BaseIntegration', () => {
  class TestIntegration extends BaseIntegration {
    async connect(): Promise<void> {
      this.logger.info('Connecting to test integration');
    }

    async disconnect(): Promise<void> {
      this.logger.info('Disconnecting from test integration');
    }

    async testMethod(): Promise<string> {
      return 'test-result';
    }
  }

  let integration: TestIntegration;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    integration = new TestIntegration({
      name: 'test-integration',
      logger: mockLogger as any,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with the provided name', () => {
      expect(integration.name).toBe('test-integration');
    });

    it('should initialize with the provided logger', () => {
      expect(integration['logger']).toBe(mockLogger);
    });

    it('should initialize with default options if not provided', () => {
      expect(integration['options']).toEqual({
        autoConnect: true,
        reconnect: true,
        maxRetries: 3,
        retryDelay: 1000,
      });
    });

    it('should override default options with provided options', () => {
      const customIntegration = new TestIntegration({
        name: 'custom-integration',
        logger: mockLogger as any,
        options: {
          autoConnect: false,
          maxRetries: 5,
        },
      });

      expect(customIntegration['options']).toEqual({
        autoConnect: false,
        reconnect: true,
        maxRetries: 5,
        retryDelay: 1000,
      });
    });
  });

  describe('connect', () => {
    it('should call the implementation connect method', async () => {
      const connectSpy = jest.spyOn(integration as any, 'connect');
      await integration.connect();
      expect(connectSpy).toHaveBeenCalled();
    });

    it('should log connection attempt', async () => {
      await integration.connect();
      expect(mockLogger.info).toHaveBeenCalledWith('Connecting to test integration');
    });

    it('should set isConnected to true on successful connection', async () => {
      expect(integration.isConnected).toBe(false);
      await integration.connect();
      expect(integration.isConnected).toBe(true);
    });

    it('should throw an error if already connected', async () => {
      await integration.connect();
      await expectAsyncError(
        () => integration.connect(),
        'Already connected to test-integration'
      );
    });

    it('should retry on failure if maxRetries > 0', async () => {
      const failingIntegration = new TestIntegration({
        name: 'failing-integration',
        logger: mockLogger as any,
        options: {
          maxRetries: 2,
          retryDelay: 10,
        },
      });

      // Make the connect method fail twice before succeeding
      let callCount = 0;
      const originalConnect = failingIntegration['connect'].bind(failingIntegration);
      jest.spyOn(failingIntegration as any, 'connect').mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Connection failed');
        }
        return originalConnect();
      });

      await failingIntegration.connect();
      expect(callCount).toBe(3); // Initial attempt + 2 retries
      expect(mockLogger.warn).toHaveBeenCalledTimes(2); // Should log retry warnings
      expect(failingIntegration.isConnected).toBe(true);
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      await integration.connect();
      jest.clearAllMocks();
    });

    it('should call the implementation disconnect method', async () => {
      const disconnectSpy = jest.spyOn(integration as any, 'disconnect');
      await integration.disconnect();
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should log disconnection', async () => {
      await integration.disconnect();
      expect(mockLogger.info).toHaveBeenCalledWith('Disconnecting from test integration');
    });

    it('should set isConnected to false after disconnection', async () => {
      expect(integration.isConnected).toBe(true);
      await integration.disconnect();
      expect(integration.isConnected).toBe(false);
    });

    it('should throw an error if not connected', async () => {
      await integration.disconnect();
      await expectAsyncError(
        () => integration.disconnect(),
        'Not connected to test-integration'
      );
    });
  });

  describe('ensureConnected', () => {
    it('should not throw if connected', async () => {
      await integration.connect();
      await expect(integration['ensureConnected']()).resolves.not.toThrow();
    });

    it('should throw if not connected', async () => {
      await expectAsyncError(
        () => integration['ensureConnected'](),
        'Not connected to test-integration'
      );
    });
  });

  describe('withConnection', () => {
    it('should execute the callback with a connection', async () => {
      const callback = jest.fn().mockResolvedValue('test-result');
      const result = await integration['withConnection'](callback);
      
      expect(callback).toHaveBeenCalled();
      expect(result).toBe('test-result');
    });

    it('should automatically connect if autoConnect is true', async () => {
      const autoConnectIntegration = new TestIntegration({
        name: 'auto-connect',
        logger: mockLogger as any,
        options: {
          autoConnect: true,
        },
      });

      const callback = jest.fn().mockResolvedValue('auto-connected');
      const result = await autoConnectIntegration['withConnection'](callback);
      
      expect(autoConnectIntegration.isConnected).toBe(true);
      expect(callback).toHaveBeenCalled();
      expect(result).toBe('auto-connected');
    });

    it('should throw if not connected and autoConnect is false', async () => {
      const noAutoConnect = new TestIntegration({
        name: 'no-auto-connect',
        logger: mockLogger as any,
        options: {
          autoConnect: false,
        },
      });

      const callback = jest.fn().mockResolvedValue('should-not-call');
      
      await expectAsyncError(
        () => noAutoConnect['withConnection'](callback),
        'Not connected to no-auto-connect'
      );
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
