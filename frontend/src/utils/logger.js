/**
 * Secure logging utility that only logs in development environments
 * This prevents sensitive data from being exposed in production
 */

// Determine if we're in production by checking if the URL includes the production domain
// or if NODE_ENV is set to 'production'
const isProduction = () => {
  return (
    process.env.NODE_ENV === 'production' ||
    window.location.hostname.includes('testcraft.ai') ||
    window.location.hostname.includes('testcraft-ai.onrender.com')
  );
};

/**
 * Safe console logger that only outputs in development environments
 */
const logger = {
  /**
   * Log info messages (only in development)
   * @param {...any} args - Arguments to log
   */
  info: (...args) => {
    if (!isProduction()) {
      console.log(...args);
    }
  },

  /**
   * Log warning messages (only in development)
   * @param {...any} args - Arguments to log
   */
  warn: (...args) => {
    if (!isProduction()) {
      console.warn(...args);
    }
  },

  /**
   * Log error messages (always logs, but sanitizes in production)
   * @param {...any} args - Arguments to log
   */
  error: (...args) => {
    if (isProduction()) {
      // In production, only log the error message without any sensitive data
      const sanitizedArgs = args.map(arg => {
        if (arg instanceof Error) {
          return arg.message; // Only log the error message, not the stack trace
        } else if (typeof arg === 'object') {
          return 'Error object'; // Don't log the actual object contents in production
        }
        return arg;
      });
      console.error(...sanitizedArgs);
    } else {
      // In development, log everything
      console.error(...args);
    }
  },

  /**
   * Log debug messages (only in development)
   * @param {...any} args - Arguments to log
   */
  debug: (...args) => {
    if (!isProduction()) {
      console.debug(...args);
    }
  }
};

export default logger;
