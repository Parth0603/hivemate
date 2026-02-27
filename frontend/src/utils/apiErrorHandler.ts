/**
 * API Error Handler with Retry Logic
 * Provides utilities for handling API errors and implementing retry strategies
 */

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  status?: number;
}

export class ApiErrorHandler {
  /**
   * Parse error response from API
   */
  static parseError(error: any): ApiError {
    if (error.response?.data?.error) {
      return {
        ...error.response.data.error,
        status: error.response.status
      };
    }

    if (error.response) {
      return {
        code: 'API_ERROR',
        message: error.response.data?.message || 'An error occurred',
        status: error.response.status,
        timestamp: new Date().toISOString()
      };
    }

    if (error.request) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Unable to reach the server. Please check your connection.',
        timestamp: new Date().toISOString()
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: ApiError): string {
    const messages: Record<string, string> = {
      'NETWORK_ERROR': 'Connection lost. Please check your internet connection.',
      'UNAUTHORIZED': 'Your session has expired. Please log in again.',
      'FORBIDDEN': 'You don\'t have permission to perform this action.',
      'NOT_FOUND': 'The requested resource was not found.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment.',
      'INTERNAL_SERVER_ERROR': 'Something went wrong on our end. Please try again later.'
    };

    return messages[error.code] || error.message;
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: ApiError): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'INTERNAL_SERVER_ERROR'
    ];

    const retryableStatuses = [408, 429, 500, 502, 503, 504];

    return (
      retryableCodes.includes(error.code) ||
      (error.status !== undefined && retryableStatuses.includes(error.status))
    );
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;
  let delay = finalConfig.initialDelay;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const apiError = ApiErrorHandler.parseError(error);

      // Don't retry if error is not retryable
      if (!ApiErrorHandler.isRetryable(apiError)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxRetries) {
        throw error;
      }

      // Wait before retrying
      console.log(`Retry attempt ${attempt + 1}/${finalConfig.maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff
      delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Create a retry wrapper for API calls
 */
export function createRetryableRequest<T>(
  requestFn: () => Promise<T>,
  config?: Partial<RetryConfig>
) {
  return () => retryWithBackoff(requestFn, config);
}

/**
 * Handle API error and show user-friendly message
 */
export function handleApiError(error: any, showToast?: (message: string) => void): ApiError {
  const apiError = ApiErrorHandler.parseError(error);
  const userMessage = ApiErrorHandler.getUserMessage(apiError);

  console.error('API Error:', apiError);

  if (showToast) {
    showToast(userMessage);
  }

  // Handle specific error codes
  if (apiError.code === 'UNAUTHORIZED' || apiError.status === 401) {
    // Clear auth token and redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return apiError;
}

/**
 * Create an axios interceptor for automatic retry
 */
export function createRetryInterceptor(axiosInstance: any, config?: Partial<RetryConfig>) {
  axiosInstance.interceptors.response.use(
    (response: any) => response,
    async (error: any) => {
      const apiError = ApiErrorHandler.parseError(error);

      if (ApiErrorHandler.isRetryable(apiError) && !error.config.__retryCount) {
        error.config.__retryCount = 0;
      }

      if (
        error.config.__retryCount !== undefined &&
        error.config.__retryCount < (config?.maxRetries || DEFAULT_RETRY_CONFIG.maxRetries)
      ) {
        error.config.__retryCount++;
        const delay = Math.min(
          (config?.initialDelay || DEFAULT_RETRY_CONFIG.initialDelay) *
            Math.pow(config?.backoffMultiplier || DEFAULT_RETRY_CONFIG.backoffMultiplier, error.config.__retryCount - 1),
          config?.maxDelay || DEFAULT_RETRY_CONFIG.maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
        return axiosInstance(error.config);
      }

      return Promise.reject(error);
    }
  );
}
