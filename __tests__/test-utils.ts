import { jest } from '@jest/globals';
import { Logger } from '../integrations/shared/types';

// Type for mocked class instances
type MockedClass<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? jest.Mock : T[K];
};

// Enhanced Logger type for testing
interface MockLogger extends Logger {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  child?: jest.Mock;
}

/**
 * Creates a mock implementation for all methods of a class
 */
export function createMockInstance<T extends new (...args: any[]) => any>(
  constructor: T,
  mockImpl: Partial<InstanceType<T>> = {}
): MockedClass<InstanceType<T>> {
  const mockObj: any = {};
  const instance = new constructor({} as any);
  
  // Get all methods from the instance, including inherited ones
  let current = instance;
  do {
    Object.getOwnPropertyNames(current)
      .concat(Object.getOwnPropertySymbols(current).map(s => s.toString()))
      .filter(prop => {
        const descriptor = Object.getOwnPropertyDescriptor(current, prop);
        return descriptor && typeof descriptor.value === 'function' && prop !== 'constructor';
      })
      .forEach(prop => {
        if (!mockObj[prop]) {
          mockObj[prop] = jest.fn();
        }
      });
    current = Object.getPrototypeOf(current);
  } while (current && current !== Object.prototype);

  // Apply any mock implementations
  Object.entries(mockImpl).forEach(([key, value]) => {
    mockObj[key] = typeof value === 'function' ? jest.fn(value) : value;
  });

  return mockObj as MockedClass<InstanceType<T>>;
}

/**
 * Creates a mock logger for testing
 */
export function createMockLogger(): MockLogger {
  const mockLogger: MockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  
  // Add child method that returns a new mock logger
  mockLogger.child = jest.fn(() => createMockLogger());
  
  return mockLogger;
}

/**
 * Creates a promise that resolves after the specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mocks the Date.now() function to always return a fixed timestamp
 */
export function mockDateNow(timestamp: number): () => void {
  const originalDateNow = Date.now;
  const mockDateNow = () => timestamp;
  
  global.Date.now = mockDateNow as any;
  
  return () => {
    global.Date.now = originalDateNow;
  };
}

/**
 * Helper to test async/await error handling
 */
export async function expectAsyncError(
  fn: () => Promise<any>,
  errorMessage?: string | RegExp
): Promise<void> {
  let error: Error | null = null;
  
  try {
    await fn();
  } catch (err) {
    error = err as Error;
  }
  
  if (!error) {
    throw new Error('Expected function to throw an error, but it did not');
  }
  
  if (errorMessage) {
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
  partial: Record<string, any>
): void {
  const calls = fn.mock.calls;
  expect(calls.length).toBeGreaterThan(index);
  
  const callArgs = calls[index];
  expect(callArgs).toBeDefined();
  
  // Find the first object argument that contains all the expected properties
  const matchingArg = callArgs.find((arg: any) => 
    arg && 
    typeof arg === 'object' && 
    Object.entries(partial).every(([key, value]) => {
      return JSON.stringify((arg as any)[key]) === JSON.stringify(value);
    })
  );
  
  expect(matchingArg).toBeDefined();
}

// Add global Jest matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeCalledWithPartial(partial: Record<string, any>): R;
    }
  }
}

// Add custom matchers
expect.extend({
  toBeCalledWithPartial(received, partial) {
    const calls = (received as jest.Mock).mock.calls;
    
    const pass = calls.some(callArgs => 
      callArgs.some((arg: any) => 
        arg && 
        typeof arg === 'object' && 
        Object.entries(partial).every(([key, value]) => 
          JSON.stringify(arg[key]) === JSON.stringify(value)
        )
      )
    );
    
    if (pass) {
      return {
        message: () => `expected function not to be called with an object containing ${JSON.stringify(partial)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected function to be called with an object containing ${JSON.stringify(partial)}`,
        pass: false,
      };
    }
  },
});
