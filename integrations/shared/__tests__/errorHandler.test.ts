import { errorHandler } from '../errorHandler';
import { createMockLogger } from '../../../../__tests__/test-utils';

describe('errorHandler', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  
  beforeEach(() => {
    mockLogger = createMockLogger();
    jest.clearAllMocks();
  });

  it('should log error with context and rethrow by default', () => {
    const error = new Error('Test error');
    const context = { userId: '123', action: 'testAction' };
    
    const wrappedHandler = errorHandler(mockLogger as any);
    const testFn = () => {
      throw error;
    };
    
    expect(() => wrappedHandler(testFn, { context })()).toThrow(error);
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in testFn',
      expect.objectContaining({
        error,
        context,
      })
    );
  });

  it('should not rethrow if shouldRethrow is false', () => {
    const error = new Error('Test error');
    const wrappedHandler = errorHandler(mockLogger as any);
    
    const testFn = () => {
      throw error;
    };
    
    expect(() => wrappedHandler(testFn, { shouldRethrow: false })()).not.toThrow();
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should work with async functions', async () => {
    const error = new Error('Async error');
    const wrappedHandler = errorHandler(mockLogger as any);
    
    const asyncFn = async () => {
      throw error;
    };
    
    await expect(wrappedHandler(asyncFn)()).rejects.toThrow(error);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in asyncFn',
      expect.objectContaining({ error })
    );
  });

  it('should include custom error message if provided', () => {
    const error = new Error('Test error');
    const wrappedHandler = errorHandler(mockLogger as any);
    
    const testFn = () => {
      throw error;
    };
    
    expect(() => wrappedHandler(testFn, { errorMessage: 'Custom error message' })()).toThrow(error);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Custom error message',
      expect.any(Object)
    );
  });

  it('should include additional data in the log', () => {
    const error = new Error('Test error');
    const additionalData = { key: 'value', count: 42 };
    const wrappedHandler = errorHandler(mockLogger as any);
    
    const testFn = () => {
      throw error;
    };
    
    expect(() => wrappedHandler(testFn, { additionalData })()).toThrow(error);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in testFn',
      expect.objectContaining({
        error,
        additionalData,
      })
    );
  });

  it('should handle non-Error objects', () => {
    const nonError = 'This is not an Error object';
    const wrappedHandler = errorHandler(mockLogger as any);
    
    const testFn = () => {
      throw nonError;
    };
    
    expect(() => wrappedHandler(testFn)()).toThrow(nonError);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in testFn',
      expect.objectContaining({
        error: expect.any(Error),
        originalError: nonError,
      })
    );
  });

  it('should handle null or undefined errors', () => {
    const wrappedHandler = errorHandler(mockLogger as any);
    
    const testFn = () => {
      // @ts-ignore - Testing runtime behavior
      throw null;
    };
    
    expect(() => wrappedHandler(testFn)()).toThrow();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in testFn',
      expect.objectContaining({
        error: expect.any(Error),
        originalError: null,
      })
    );
  });

  it('should pass through successful results', () => {
    const wrappedHandler = errorHandler(mockLogger as any);
    const testFn = () => 'success';
    
    const result = wrappedHandler(testFn)();
    expect(result).toBe('success');
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should pass through successful async results', async () => {
    const wrappedHandler = errorHandler(mockLogger as any);
    const testFn = async () => 'async success';
    
    const result = await wrappedHandler(testFn)();
    expect(result).toBe('async success');
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
