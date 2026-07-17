const express = require("express");
// const {isAuthenticatedUser} = require("../middleware/auth")
const {registerUser,loginUser,sendEmail, verifyEmail} = require("../Controller/auth_controller");
const router = express.Router();


router.post("/createUser",registerUser);
router.post("/verify-email",verifyEmail);
// router.get("/googleAuth",googleRegister);
// router.get("/googleauthCallback",googleCallback);
// router.get("/me",isAuthenticatedUser,getUser)
router.post("/login",loginUser);
router.post("/email",sendEmail);
// router.post("/logout",logout)

module.exports = router;