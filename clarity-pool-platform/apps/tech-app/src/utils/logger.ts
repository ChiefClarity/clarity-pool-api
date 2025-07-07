// Simple logger implementation for tech app
export const logger = {
  info: (message: string, data?: any, context?: string) => {
    console.log(`[INFO]${context ? ` [${context}]` : ''} ${message}`, data || '');
  },
  error: (message: string, error?: any, context?: string) => {
    console.error(`[ERROR]${context ? ` [${context}]` : ''} ${message}`, error || '');
  },
  warn: (message: string, data?: any, context?: string) => {
    console.warn(`[WARN]${context ? ` [${context}]` : ''} ${message}`, data || '');
  },
  debug: (message: string, data?: any, context?: string) => {
    if (__DEV__) {
      console.log(`[DEBUG]${context ? ` [${context}]` : ''} ${message}`, data || '');
    }
  },
};