import { Router } from "express";
import {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    registerUsingOTP,
    registerWithOTP,
    loginUsingOTP,
    loginWithOTP,
    setPassword
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { registerValidation, registerUsingOTPValidation, registerWithOTPValidation, loginValidation, loginUsingOTPValidation, loginWithOTPValidation, changeCurrentPasswordValidation, setPasswordValidation, updateAccountDetailsValidation, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * Routing Configuration for User Authentication and Profile Management.
 * * * Key Patterns:
 * - Validation: Each sensitive route uses specific middleware (e.g., registerValidation).
 * - File Handling: Uses 'upload.fields' or 'upload.single' for profile assets.
 * - Security: Protected routes are locked behind 'verifyJWT'.
 */

// PUBLIC ROUTES:
// POST /register: Handles multi-part data for new user accounts, including avatar and cover images.
router.route("/register").post(registerValidation,
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]), registerUser);

// POST /register-using-OTP: Handles user is being register using OTP or not.
router.route("/register-using-otp").post(registerUsingOTPValidation, upload.none(), registerUsingOTP)
// POST /register-with-OTP: Handles user is successfully registered with OTP or not.
router.route("/register-with-otp").post(registerWithOTPValidation, upload.none(), registerWithOTP)

// POST /login: Authenticates users and issues session tokens.
router.route("/login").post(loginValidation, upload.none(), loginUser);

// POST /login-using-otp: Handles user is being login using OTP or not.
router.route("/login-using-otp").post(loginUsingOTPValidation, upload.none(), loginUsingOTP)
// POST /login-with-otp: Handles user is successfully logged in with OTP or not.
router.route("/login-with-otp").post(registerWithOTPValidation, upload.none(), loginWithOTP)

// POST /refresh-token: Exchanges a valid Refresh Token for a new Access Token.
router.route("/refresh-token").post(refreshAccessToken);

// PROTECTED ROUTES (Requires Login):
// POST /logout: Invalidates session tokens and clears client cookies.
router.route("/logout").post(verifyJWT, logoutUser);
// POST /change-password: Validates old password before hashing and saving the new one.
router.route("/set-password").post(setPasswordValidation, upload.none(), verifyJWT, setPassword)
// POST /change-password: Validates old password before hashing and saving the new one.
router.route("/change-password").post(changeCurrentPasswordValidation, upload.none(), verifyJWT, changeCurrentPassword)
// GET /current-user: Returns the authenticated user's profile data.
router.route("/current-user").get(verifyJWT, getCurrentUser)
// PATCH /update-account: Updates non-sensitive profile details like fullName or email.
router.route("/update-account").patch(updateAccountDetailsValidation, upload.none(), verifyJWT, updateAccountDetails)
// PATCH /avatar: Specific endpoint for updating profile avatar on Cloudinary.
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
// PATCH /cover-image: Specific endpoint for updating profile cover image on Cloudinary.
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

export default router
