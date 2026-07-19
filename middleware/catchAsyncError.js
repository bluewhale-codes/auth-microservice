// module.exports = (theFunc) => (req,res,next)=>{
//   Promise.resolve(theFunc(req,res,next)).catch(next)
// };





const ErrorHandler = require('../utils/errorhandler');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

const catchAsyncError = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // If it's already our custom error, pass it through
      if (error instanceof ErrorHandler) {
        return next(error);
      }
      
      // Handle JWT-specific errors
      if (error.name === 'JsonWebTokenError') {
        return next(new ErrorHandler(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED));
      }
      
      if (error.name === 'TokenExpiredError') {
        return next(new ErrorHandler(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED));
      }
      
      // Handle PostgreSQL unique violation (duplicate entry)
      if (error.code === '23505') {
        return next(new ErrorHandler('Duplicate entry found', HTTP_STATUS.CONFLICT));
      }
      
      // Handle PostgreSQL foreign key violation
      if (error.code === '23503') {
        return next(new ErrorHandler('Referenced record not found', HTTP_STATUS.BAD_REQUEST));
      }
      
      // Generic error — wrap it
      next(new ErrorHandler(
        error.message || ERROR_MESSAGES.INTERNAL_ERROR,
        error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
      ));
    });
  };
};

module.exports = catchAsyncError;