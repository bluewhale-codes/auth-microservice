/**
 * Custom Error Handler Class
 * Extends native Error with status code for HTTP responses
 * Follows OWASP guidelines for generic error messages in production
 */
class ErrorHandler extends Error {
  constructor(message, statusCode,errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode
    this.isOperational = true; // Distinguishes operational errors from programming errors

    // Capture stack trace (excluding constructor call)
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorHandler;