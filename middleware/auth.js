const catchAsyncErrors = require("../middleware/catchAsyncError");
const ErrorHander = require("../utils/errorhandler");
const User = require("../Model/userModel");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "chandigarhPB@123";

exports.isAuthenticatedUser = catchAsyncErrors(async (req,res,next)=>{

    const {Token} = req.cookies;
    if(!Token){
        return next(new ErrorHander("Please login to access this resource",401))
        }

    const decodedData = jwt.verify(Token,JWT_SECRET);
    console.log(decodedData);
    
    req.user = await User.findById(decodedData.userInfo._id);
    next();
})