

module.exports = (err,req,res,next) =>{
     err.statusCode = err.statusCode || 500;
     err.message = err.message || "Internal server Error";
     err.errorCode = err.errorCode || "ERROR_FOUND"


     res.status(err.statusCode).json({
        success:false,
        message:err.message,
        errorCode:err.errorCode
     })
}