const express = require("express");
// const {isAuthenticatedUser} = require("../middleware/auth")

const upload = require("../middleware/multer");
const {registerUser,loginUser, verifyEmail,resendOTP,sendWorkerOTP , verifyWorkerOTP ,refreshToken,completeFacultyRegistration ,completeWorkerRegistration,completeStudentRegistration} = require("../Controller/auth_controller");
const router = express.Router();
const { validateSendOTP, validateVerifyOTP, validateRegister  , validate} = require('../validators/worker.validator');
const {validateCompleteRegistration, validateStudent,} = require('../validators/student.validator');
const {validateFacultyRegistration, validateFaculty,} = require('../validators/faculty.validator');
const {validateLoginData, validateLogin,} = require('../validators/login.validator');
const {validateRefreshToken} = require('../validators/refreshToken.validator');
const { authLimiter } = require('../middleware/rateLimiter');
const {authenticate} = require("../middleware/auth");
const { validateResendOTP} = require("../validators/auth.validator")



router.post("/createUser",registerUser);
router.post("/verify-email",verifyEmail);
router.post('/resend-otp',resendOTP);
// router.get("/googleAuth",googleRegister);
// router.get("/googleauthCallback",googleCallback);
// router.get("/me",isAuthenticatedUser,getUser)

router.post(
  '/login',
  validateLoginData(validateLogin),
  loginUser
);







// worker Routes
// STEP 1: Send OTP
router.post('/send-otp-worker', validate(validateSendOTP), sendWorkerOTP);

// STEP 2: Verify OTP
router.post('/verify-otp-worker', validate(validateVerifyOTP), verifyWorkerOTP);

// STEP 3: Complete Registration (Multipart)
router.post('/register-worker', upload.single('id_card_image'), validate(validateRegister), completeWorkerRegistration);


// Register Student
router.post(
  '/complete-registration-student',
  validateStudent(validateCompleteRegistration), // 2. Validate body
  authenticate,        // 1. Verify JWT
  completeStudentRegistration
);

// Faculty Registration
router.post(
  '/complete-registration-faculty',
  validateFaculty(validateFacultyRegistration), // 2. Validate body
  authenticate,        // 1. Verify JWT
  completeFacultyRegistration
);

router.post(
  '/refresh-token',
  validate(validateRefreshToken),
  refreshToken
);

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