const catchAsyncErrors = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorhandler");
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');


const jwt = require("../utils/jwt");
const JWT_SECRET = "chandigarhPB@123";

// exports.isAuthenticatedUser = catchAsyncErrors(async (req,res,next)=>{

//     const {Token} = req.cookies;
//     if(!Token){
//         return next(new ErrorHander("Please login to access this resource",401))
//         }

//     const decodedData = jwt.verify(Token,JWT_SECRET);
//     console.log(decodedData);
    
//     req.user = await User.findById(decodedData.userInfo._id);
//     next();
// })


// ─── Verify JWT Token ───
exports.authenticate = catchAsyncErrors(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Auth Header: " + authHeader);

  // Check if Authorization header exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ErrorHandler(ERROR_MESSAGES.TOKEN_MISSING, HTTP_STATUS.UNAUTHORIZED,"TOKEN_MISSING"));
  }

  // Extract token (remove "Bearer " prefix)
  const token = authHeader.split(' ')[1];
  console.log(token, "This is my token");

  if (!token) {
    return next(new ErrorHandler(ERROR_MESSAGES.TOKEN_MISSING, HTTP_STATUS.UNAUTHORIZED,"TOKEN_MISSING"));
  }

  try {
    // Verify token using your jwt utility
    const decoded = jwt.verifyAccessToken(token);

    // Attach user info to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    // Proceed to next middleware or controller
    next();
  } catch (error) {
    // Check specifically for token expiration
    if (error.name === 'TokenExpiredError') {
      return next(new ErrorHandler(
        'Token has expired. Please login again.',
        HTTP_STATUS.UNAUTHORIZED,
        "TOKEN_EXPIRED"
      ));
    }

    // Check for malformed/invalid token
    if (error.name === 'JsonWebTokenError') {
      return next(new ErrorHandler(
        'Invalid token. Please login again.',
        HTTP_STATUS.UNAUTHORIZED,
        "INVALID_TOKEN"
      ));
    }

    // Generic invalid token fallback
    return next(new ErrorHandler(
      ERROR_MESSAGES.INVALID_TOKEN,
      HTTP_STATUS.UNAUTHORIZED
    ));
  }
});