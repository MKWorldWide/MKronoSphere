import { ErrorHandler } from '../errorHandler';
import { createMockLogger } from '../../../__tests__/test-utils';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: ReturnType<typeof createMockLogger>;
  
  beforeEach(() => {
    mockLogger = createMockLogger();
    errorHandler = new ErrorHandler('TestHandler');
    // Override the logger for testing
    (errorHandler as any).logger = mockLogger;
  });

  it('should log error with context', () => {
    const error = new Error('Test error');
    const context = { userId: '123', action: 'testAction' };
    
    errorHandler.handleError(error, context);
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in TestHandler',
      expect.objectContaining({
        error: expect.any(Error),
        context: expect.objectContaining({
          userId: '123',
          action: 'testAction'
        })
      })
    );
  });

  it('should handle non-Error objects', () => {
    const nonError = 'Not an error object';
    
    errorHandler.handleError(nonError as any);
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in TestHandler',
      expect.objectContaining({
        error: expect.any(Error),
        originalValue: nonError
      })
    );
  });

  it('should handle undefined error', () => {
    errorHandler.handleError(undefined as any);
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in TestHandler',
      expect.objectContaining({
        error: expect.any(Error),
        originalValue: undefined
      })
    );
  });

  it('should handle null error', () => {
    errorHandler.handleError(null as any);
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in TestHandler',
      expect.objectContaining({
        error: expect.any(Error),
        originalValue: null
      })
    );
  });

  it('should include stack trace in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const error = new Error('Test error');
    errorHandler.handleError(error);
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in TestHandler',
      expect.objectContaining({
        error: expect.any(Error),
        stack: expect.stringContaining('Error: Test error')
      })
    );
    
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should not include stack trace in production', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const error = new Error('Test error');
    errorHandler.handleError(error);
    
    const call = (mockLogger.error as jest.Mock).mock.calls[0][1];
    expect(call).not.toHaveProperty('stack');
    
    process.env.NODE_ENV = originalNodeEnv;
  });
});
