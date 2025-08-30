import { jest } from '@jest/globals';

type MockedClass<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? jest.Mock : T[K];
};

/**
 * Creates a mock implementation for all methods of a class
 */
export function createMockInstance<T extends new (...args: any[]) => any>(
  constructor: T,
  mockImpl?: Partial<InstanceType<T>>,
): MockedClass<InstanceType<T>> {
  const mockObj: any = {};
  const instance = new constructor({} as any);
  
  // Get all methods from the instance, including inherited ones
  let current = instance;
  do {
    Object.getOwnPropertyNames(current)
      .filter(prop => typeof (instance as any)[prop] === 'function' && prop !== 'constructor')
      .forEach(method => {
        if (!mockObj[method]) {
          mockObj[method] = jest.fn();
        }
      });
  } while ((current = Object.getPrototypeOf(current)) && Object.getPrototypeOf(current));

  // Apply any custom mock implementations
  if (mockImpl) {
    Object.entries(mockImpl).forEach(([key, value]) => {
      if (typeof value === 'function') {
        mockObj[key] = jest.fn(value as any);
      } else {
        mockObj[key] = value;
      }
    });
  }

  return mockObj as MockedClass<InstanceType<T>>;
}

/**
 * Creates a promise that resolves after the specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => global.setTimeout(resolve, ms));
}

/**
 * Mocks the Date.now() function to always return a fixed timestamp
 */
export function mockDateNow(timestamp: number): () => void {
  const originalDateNow = Date.now;
  (global.Date as any).now = jest.fn(() => timestamp);
  
  return () => {
    (global.Date as any).now = originalDateNow;
  };
}

/**
 * Creates a mock logger for testing
 */
export function createMockLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockImplementation(() => createMockLogger()),
  };
}

/**
 * Helper to test async/await error handling
 */
export async function expectAsyncError(
  fn: () => Promise<any>,
  errorMessage?: string | RegExp,
): Promise<void> {
  let error: Error | undefined;
  try {
    await fn();
  } catch (err) {
    error = err as Error;
  }
  
  expect(error).toBeDefined();
  
  if (errorMessage && error) {
    if (typeof errorMessage === 'string') {
      expect(error.message).toContain(errorMessage);
    } else {
      expect(error.message).toMatch(errorMessage);
    }
  }
}

/**
 * Helper to test if a function was called with specific arguments
 */
export function expectCalledWith(fn: jest.Mock, ...args: any[]): void {
  expect(fn).toHaveBeenCalledWith(...args);
}

/**
 * Helper to test if a function was called with an object that includes specific properties
 */
export function expectCalledWithPartial(
  fn: jest.Mock,
  index: number,
  partial: Record<string, any>,
): void {
  const calls = fn.mock.calls;
  expect(calls.length).toBeGreaterThan(index);
  
  const callArgs = calls[index];
  expect(callArgs).toEqual(
    expect.arrayContaining([expect.objectContaining(partial)])
  );
}

// Add global Jest types
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeCalledWithPartial(partial: Record<string, any>): R;
    }
  }
}
