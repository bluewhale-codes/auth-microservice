const express = require("express");
// const {isAuthenticatedUser} = require("../middleware/auth")
const {registerUser,loginUser, verifyEmail,resendOTP} = require("../Controller/auth_controller");
const router = express.Router();


const { validateResendOTP} = require("../validators/auth.validator")



router.post('/resend-otp',resendOTP);
router.post("/createUser",registerUser);
router.post("/verify-email",verifyEmail);
// router.get("/googleAuth",googleRegister);
// router.get("/googleauthCallback",googleCallback);
// router.get("/me",isAuthenticatedUser,getUser)
router.post("/login",loginUser);

// router.post("/logout",logout)

module.exports = router;

// const apiLimiter = rateLimit({
//   windowMs:  10 * 60 * 1000, // 1 minutes
//   max: 5,
//   keyGenerator: (req) =>
//     req.body.email?.toLowerCase() || req.ip,

//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: (req, res) => {
//     res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
//       success: false,
//       message: 'Too many requests. Please try again later.'
//     });
//   }
// });