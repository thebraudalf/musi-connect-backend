import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteImageFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import path from "path";
import { extractPublicId } from "cloudinary-build-url";
import { generateOTP, sendMail } from "../utils/mailer/mailer.js";
import { validate } from "deep-email-validator";

/**
 * @method registerUser
 * Standard user onboarding process.
 * 1. Validates required fields (username, email, password).
 * 2. Checks if the user already exists in the Database.
 * 3. Handles local file uploads for Avatar and Cover Images using Multer.
 * 4. Uploads those files to Cloudinary and retrieves the permanent URLs.
 * 5. Creates the user record and returns the user object without sensitive fields (password).
 */
const registerUser = asyncHandler(async (req, res) => {
  // Step 1. get user details
  // Step 2. check for validation
  // Step 3. check if user is already registered or not
  // Step 4. check for images, check for avatar
  // Step 5. upload them to cloudinary
  // Step 6. register user or create user object in db
  // Step 7. remove password and refresh token field from response
  // Step 8. check for user creation
  // Step 9. return response

  // getting user details
  const { username, email, fullName, password } = req.body;
  //console.log("email: ", email);

  // checking validation of fields
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    console.log("All Fields are required");
    throw new ApiError(400, "All fields are required");
  }

  const validateAEmail = await validate({
    email,
    validateMx: true,
    validateDisposable: true,
    validateRegex: true,
    validateSMTP: true,
  });

  if (validateAEmail.valid === false) {
    console.log("Please enter a valid email address.");
    throw new ApiError(400, "Please enter a valid email address.");
  }

  // checking if user is already exist
  const existedUser = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });

  if (existedUser) {
    // Handle existing user
    throw new ApiError(409, "Email or username already exists");
  }

  // checking if avatar and coverImage local path is given
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //console.log(avatarLocalPath);

  // if (!avatarLocalPath) {
  //     throw new ApiError(400, "Avatar file path is required")
  // }

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
    //console.log(coverImageLocalPath);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  //console.log(avatar);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  //console.log(coverImage);

  // if (!avatar) {
  //     throw new ApiError(400, "Avatar file is required")
  // }

  // creating user object
  const user = await User.create({
    fullName,
    avatar: avatar?.url || "",
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // removing password and refreshToken field from res
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // returning response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

/**
 * @method registerUsingOTP
 * Standard user onboarding process.
 * 1. Validates required fields (username, email, password).
 * 2. Checks if the user already exists in the Database.
 * 3. Handles local file uploads for Avatar and Cover Images using Multer.
 * 4. Uploads those files to Cloudinary and retrieves the permanent URLs.
 * 5. Creates the user record and returns the user object without sensitive fields (password).
 */
const registerUsingOTP = asyncHandler(async (req, res) => {
  // Step 1. get user details
  // Step 2. check for validation
  // Step 3. check if user is already registered or not
  // Step 6. register user or create user object in db
  // Step 7. remove password and refresh token field from response
  // Step 8. check for user creation
  // Step 9. return response

  // getting user details
  const { email } = req.body;
  //console.log("email: ", email);

  // checking validation of fields
  if (!email) {
    throw new ApiError(400, "Email field is required");
  }

  const validateAEmail = await validate({
    email,
    validateMx: true,
    validateDisposable: true,
    validateRegex: true,
    validateSMTP: true,
  });

  if (validateAEmail.valid === false) {
    throw new ApiError(400, "Please enter a valid email address.");
  }

  // checking if user is already exist
  const existedUser = await User.findOne({
    email: email,
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // creating user object
  const user = await User.create({
    email,
  });

  // If user is blocked, return an error
  if (user.isBlocked) {
    const currentTime = new Date();
    if (currentTime < user.blockUntil) {
      throw new ApiError(403, "Account blocked. Try after some time.");
    } else {
      user.isBlocked = false;
      user.OTPAttempts = 0;
    }
  }

  // Check for minimum 1-minute gap between OTP requests
  const lastOTPTime = user.OTPCreatedTime;
  const currentTime = new Date();

  if (lastOTPTime && currentTime - lastOTPTime < 60000) {
    throw new ApiError(
      403,
      "Minimum 1-minute gap required between OTP requests",
    );
  }

  const OTP = generateOTP();
  user.OTP = OTP;
  user.OTPCreatedTime = currentTime;

  await user.save();

  sendMail(email, "Your OTP for Registeration", `Your OTP is: ${OTP}`);

  // returning response
  return res
    .status(201)
    .json(new ApiResponse(200, undefined, "OTP sent successfully"));
});

// generating access and refresh token
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken: accessToken, refreshToken: refreshToken };
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

/**
 * @method registerWithOTP
 * Authentication and Session Management.
 * 1. Validates credentials (email/username + password).
 * 2. If valid, generates a pair of JWTs: Access Token (short-lived) and Refresh Token (long-lived).
 * 3. Saves the Refresh Token in the Database to manage multi-device sessions.
 * 4. Sends both tokens back to the client via secure, httpOnly Cookies.
 */
const registerWithOTP = asyncHandler(async (req, res) => {
  // Step 1: get user's username, email and password
  // Step 2: check for Validation
  // Step 3: check if user is registered user or not
  // Step 4: check req body password with user password in db
  // Step 5: generate access token and refresh token
  // Step 6: remove password and refresh token field from response
  // Step 7: send tokens with cookies
  // Step 8: return res

  // get email and OTP
  const { email, OTP } = req.body;
  console.log("email: ", email);

  // checking validation of field
  if (!email || !OTP) {
    throw new ApiError(400, "email and OTP are required");
  }

  const validateAEmail = await validate({
    email,
    validateMx: true,
    validateDisposable: true,
    validateRegex: true,
    validateSMTP: true,
  });

  if (validateAEmail.valid === false) {
    throw new ApiError(400, "Please enter a valid email address.");
  }

  // checking if user is registered user
  const user = await User.findOne({
    email: email,
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // Check if user account is blocked
  if (user.isBlocked) {
    const currentTime = new Date();
    if (currentTime < user.blockUntil) {
      throw new ApiError(403, "Account blocked. Try after some time.");
    } else {
      user.isBlocked = false;
      user.OTPAttempts = 0;
    }
  }

  if (user.OTP !== OTP) {
    user.OTPAttempts++;

    // If OTP attempts >= 5, block user for 1 hour
    if (user.OTPAttempts >= 5) {
      user.isBlocked = true;
      let blockUntil = new Date();
      blockUntil.setHours(blockUntil.getHours() + 1);
      user.blockUntil = blockUntil;
    }

    await user.save();

    throw new ApiError(403, "Invalid OTP");
  }

  // Check if OTP is within 5 minutes
  const OTPCreatedTime = user.OTPCreatedTime;
  const currentTime = new Date();

  if (currentTime - OTPCreatedTime > 5 * 60 * 1000) {
    throw new ApiError(403, "OTP expired");
  }

  // generating access token and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  // Clear OTP
  user.OTP = undefined;
  user.OTPCreatedTime = undefined;
  user.OTPAttempts = 0;

  await user.save();

  // removing password and refreshToken field from res
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  sendMail(
    email,
    "Welcome to MusiConnect, User",
    `Thank you for coming, User
    \nHope we try to elevate your music mood today.\n
    \n\n\n
    \nA small request please share about our platform on your socials if you liked our work.\n
    \n\n\n
    Best Wishes, MusiConnect Team
    `,
  );

  // sending tokens with cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  // return response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

/**
 * @method loginUser
 * Authentication and Session Management.
 * 1. Validates credentials (email/username + password).
 * 2. If valid, generates a pair of JWTs: Access Token (short-lived) and Refresh Token (long-lived).
 * 3. Saves the Refresh Token in the Database to manage multi-device sessions.
 * 4. Sends both tokens back to the client via secure, httpOnly Cookies.
 */
const loginUser = asyncHandler(async (req, res) => {
  // Step 1: get user's username, email and password
  // Step 2: check for Validation
  // Step 3: check if user is registered user or not
  // Step 4: check req body password with user password in db
  // Step 5: generate access token and refresh token
  // Step 6: remove password and refresh token field from response
  // Step 7: send tokens with cookies
  // Step 8: return res

  // get username, email and password
  const { username, email, password } = req.body;
  //console.log("email: ", email);

  // checking validation of fields
  if (!(username || email)) {
    console.log("username or email is required");
    throw new ApiError(400, "username or email is required");
  }

  if (email) {
    const validateAEmail = await validate({
      email,
      validateMx: true,
      validateDisposable: true,
      validateRegex: true,
      validateSMTP: true,
    });

    if (validateAEmail.valid === false) {
      console.log("Please enter a Valid email address");
      throw new ApiError(400, "Please enter a valid email address.");
    }
  }

  // checking if user is registered user
  const user = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });
  
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User credentials");
  }

  // generating access token and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  // removing password and refreshToken field from res
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  // sending tokens with cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  // return response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
        "User logged In Successfully",
      ),
    );
});

/**
 * @method loginUsingOTP
 * Standard user onboarding process.
 * 1. Validates required fields (username, email, password).
 * 2. Checks if the user already exists in the Database.
 * 3. Handles local file uploads for Avatar and Cover Images using Multer.
 * 4. Uploads those files to Cloudinary and retrieves the permanent URLs.
 * 5. Creates the user record and returns the user object without sensitive fields (password).
 */
const loginUsingOTP = asyncHandler(async (req, res) => {
  // Step 1. get user details
  // Step 2. check for validation
  // Step 3. check if user is already registered or not
  // Step 6. register user or create user object in db
  // Step 7. remove password and refresh token field from response
  // Step 8. check for user creation
  // Step 9. return response

  // getting user details
  const { email, username } = req.body;
  //console.log("email: ", email);

  // checking validation of fields
  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  if (email) {
    const validateAEmail = await validate({
      email,
      validateMx: true,
      validateDisposable: true,
      validateRegex: true,
      validateSMTP: true,
    });

    if (validateAEmail.valid === false) {
      throw new ApiError(400, "Please enter a valid email address.");
    }
  }

  // checking if user is registered user
  const user = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // If user is blocked, return an error
  if (user.isBlocked) {
    const currentTime = new Date();
    if (currentTime < user.blockUntil) {
      throw new ApiError(403, "Account blocked. Try after some time.");
    } else {
      user.isBlocked = false;
      user.OTPAttempts = 0;
    }
  }

  // Check for minimum 1-minute gap between OTP requests
  const lastOTPTime = user.OTPCreatedTime;
  const currentTime = new Date();

  if (lastOTPTime && currentTime - lastOTPTime < 60000) {
    throw new ApiError(
      403,
      "Minimum 1-minute gap required between OTP requests",
    );
  }

  const OTP = generateOTP();
  user.OTP = OTP;
  user.OTPCreatedTime = currentTime;

  await user.save();

  sendMail(user.email, "OTP to Log in MusiConnect", `Your OTP is: ${OTP}`);

  // returning response
  return res
    .status(201)
    .json(new ApiResponse(200, undefined, "OTP sent successfully"));
});

/**
 * @method loginWithOTP
 * Authentication and Session Management.
 * 1. Validates credentials (email/username + password).
 * 2. If valid, generates a pair of JWTs: Access Token (short-lived) and Refresh Token (long-lived).
 * 3. Saves the Refresh Token in the Database to manage multi-device sessions.
 * 4. Sends both tokens back to the client via secure, httpOnly Cookies.
 */
const loginWithOTP = asyncHandler(async (req, res) => {
  // Step 1: get user's username, email and password
  // Step 2: check for Validation
  // Step 3: check if user is registered user or not
  // Step 4: check req body password with user password in db
  // Step 5: generate access token and refresh token
  // Step 6: remove password and refresh token field from response
  // Step 7: send tokens with cookies
  // Step 8: return res

  // get username, email and OTP
  const { username, email, OTP } = req.body;
  //console.log("email: ", email);

  // checking validation of fields
  if (!(username || email) || !OTP) {
    throw new ApiError(400, "username or email and OTP are required");
  }

  if (email) {
    const validateAEmail = await validate({
      email,
      validateMx: true,
      validateDisposable: true,
      validateRegex: true,
      validateSMTP: true,
    });

    if (validateAEmail.valid === false) {
      throw new ApiError(400, "Please enter a valid email address.");
    }
  }

  // checking if user is registered user
  const user = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // Check if user account is blocked
  if (user.isBlocked) {
    const currentTime = new Date();
    if (currentTime < user.blockUntil) {
      throw new ApiError(403, "Account blocked. Try after some time.");
    } else {
      user.isBlocked = false;
      user.OTPAttempts = 0;
    }
  }

  if (user.OTP !== OTP) {
    user.OTPAttempts++;

    // If OTP attempts >= 5, block user for 1 hour
    if (user.OTPAttempts >= 5) {
      user.isBlocked = true;
      let blockUntil = new Date();
      blockUntil.setHours(blockUntil.getHours() + 1);
      user.blockUntil = blockUntil;
    }

    await user.save();

    throw new ApiError(403, "Invalid OTP");
  }

  // Check if OTP is within 5 minutes
  const OTPCreatedTime = user.OTPCreatedTime;
  const currentTime = new Date();

  if (currentTime - OTPCreatedTime > 5 * 60 * 1000) {
    throw new ApiError(403, "OTP expired");
  }

  // generating access token and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  // Clear OTP
  user.OTP = undefined;
  user.OTPCreatedTime = undefined;
  user.OTPAttempts = 0;

  await user.save();

  sendMail(
    user.email,
    `Welcome Back to MusiConnect, ${user.fullName || "User"}`,
    `Thank you for coming again, ${user.fullName || "User"}\n
    \n Hope we try to elevate your music mood today.\n
    \n\n\n
    \nA small request please share about our platform on your socials if you liked our work.\n
    \n\n\n
    Best Wishes, MusiConnect Team
    `,
  );

  // removing password and refreshToken field from res
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  // sending tokens with cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  // return response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
        "User logged In Successfully",
      ),
    );
});

/**
 * @method logoutUser
 * Standard security procedure to terminate a user session.
 * 1. Locates the user in the Database using the ID attached to the request by the 'verifyJWT' middleware.
 * 2. Uses the '$unset' operator to remove the 'refreshToken' from the Database, effectively
 * invalidating all long-term sessions for that user.
 * 3. Clears the 'accessToken' and 'refreshToken' cookies from the user's browser.
 */
const logoutUser = asyncHandler(async (req, res) => {
  // Step 1: verify access token and remove access token from db
  // Step 2: clear access token from cookies and return res

  // verifying access token and removing access token from db
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    },
  );

  // clearing access token from cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  // returing response
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

/**
 * @method refreshAccessToken
 * The "Silent Re-login" mechanism.
 * 1. Triggered when an Access Token expires.
 * 2. Verifies the incoming Refresh Token against the one stored in the Database.
 * 3. If matched, issues a brand-new Access Token pair, allowing the user to stay logged in.
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  // Step 1: get incoming refresh token
  // Step 2: decode or verify refresh token
  // Step 3: check verified refresh token with db refresh token
  // Step 4: send tokens with cookies
  // Step 5: return res

  // getting incoming refresh token
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  // decoding and verifying refresh token
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    // checking verifed token with db refresh token
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used");
    }

    // sending tokens with cookies
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id,
    );

    // returning response
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken: accessToken, refreshToken: refreshToken },
          "Access token refreshed",
        ),
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

/**
 * @method setPassword
 * Secure credential update logic.
 * 2. If valid, assigns the 'newPassword' to the user object.
 * 3. Triggers the 'pre-save' hook in the User model (which re-hashes the new password)
 * by calling 'user.save()'.
 */
const setPassword = asyncHandler(async (req, res) => {
  // Step 1: get new password
  // Step 2: find user with user id(which is saved in db)
  // Step 3: check if password is null or udefined
  // Step 4: save new password
  // Step 5: return res

  // getting new password
  const { newPassword } = req.body;

  // finding user with user id(which is saved in db)
  const user = await User.findById(req.user?._id);

  if (!(user.password === null || user.password === undefined)) {
    throw new ApiError(401, "Unable to set password for this email.");
  }

  // saving new password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  // returing response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        undefined,
        "Password for this email has been created successfully",
      ),
    );
});

/**
 * @method changeCurrentPassword
 * Secure credential update logic.
 * 1. Compares the 'oldPassword' provided by the user against the hashed password in the Database
 * using the 'isPasswordCorrect' custom method.
 * 2. If valid, assigns the 'newPassword' to the user object.
 * 3. Triggers the 'pre-save' hook in the User model (which re-hashes the new password)
 * by calling 'user.save()'.
 */
const changeCurrentPassword = asyncHandler(async (req, res) => {
  // Step 1: get old and new password
  // Step 2: find user with user id(which is saved in db)
  // Step 3: check if password is correct
  // Step 4: save new password
  // Step 5: return res

  // getting old and new password
  const { oldPassword, newPassword } = req.body;

  // finding user with user id(which is saved in db)
  const user = await User.findById(req.user?._id);

  // checking if password is correct
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  // saving new password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  // returing response
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

/**
 * @method getCurrentUser
 * Identity verification endpoint.
 * 1. Simply returns the 'req.user' object which was already fetched and
 * verified by the 'verifyJWT' middleware.
 * 2. Used by the frontend on application load to check if a session is still
 * active and to populate the user profile UI.
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  // Step 1: return res

  // returning response
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

/**
 * @method updateAccountDetails
 * Profile metadata synchronization.
 * 1. Allows users to update non-sensitive information like 'fullName', 'email', and 'username'.
 * 2. Uses 'findByIdAndUpdate' with the '$set' operator to modify only the specified fields.
 * 3. Returns the updated user document (excluding the password) to ensure the
 * frontend state remains in sync with the Database.
 */
const updateAccountDetails = asyncHandler(async (req, res) => {
  // Step 1: get details or fields to update
  // Step 2: find user with user id(which is saved in db) and update the fields
  // Step 3: return res

  // getting details or fields to update
  const { username, fullName, email } = req.body;

  if ([fullName, email, username].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  // finding user with user id and update the fields
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        username: username,
        fullName: fullName,
        email: email,
      },
    },
    { new: true },
  ).select("-password");

  // returning response
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

/**
 * @method updateUserAvatar
 * Profile Customization logic.
 * 1. Extracts the 'Public ID' from the existing Cloudinary URL.
 * 2. Deletes the old avatar image from Cloudinary to save storage space.
 * 3. Uploads the new image and updates the User document in MongoDB.
 */
const updateUserAvatar = asyncHandler(async (req, res) => {
  // Step 1: get user avatar local path
  // Step 2: delete old avatar from cloudinary
  // Step 3: upload avatar local path to cloudinary
  // Step 4: find user with user id(which is saved in db) and update the avatar
  // Step 5: return res

  // getting user avatar local path
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // deleting old avatar from cloudinary
  const oldAvatarPath = extractPublicId(`"${req.user?.avatar}"`);
  //console.log(oldCoverImagePath.trim())

  if (oldAvatarPath !== undefined) {
    const oldAvatar = await deleteImageFromCloudinary(oldAvatarPath.trim());

    if (!oldAvatar) {
      throw new ApiError(400, "Error while deleting old cover image");
    }
  }

  // uploading avatar local path to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  // finding user with user id and updating the avatar
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true },
  ).select("-password");

  // returing response
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

/**
 * @method updateUserAvatar / updateUserCoverImage
 * Profile Customization logic.
 * 1. Extracts the 'Public ID' from the existing Cloudinary URL.
 * 2. Deletes the old image from Cloudinary to save storage space.
 * 3. Uploads the new image and updates the User document in MongoDB.
 */
const updateUserCoverImage = asyncHandler(async (req, res) => {
  // Step 1: get user cover image local path
  // Step 2: delete old cover image of db from cloudinary
  // Step 2: upload cover image local path to cloudinary
  // Step 3: find user with user id and update the cover image
  // Step 4: return res

  // getting  user cover image local path
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  // deleting old cover image of db from cloudinary
  // let filenameWithPrefix, filenameWithoutPrefix;
  // if (oldCoverImagePath) {
  //     filenameWithPrefix = path.basename(oldCoverImagePath)
  //     filenameWithoutPrefix = path.basename(filenameWithPrefix, path.extname(filenameWithPrefix))
  //     console.log(filenameWithPrefix);
  // } else {
  //     console.error("Cover image is not found");
  // }

  // another logic to delete cover image
  const oldCoverImagePath = extractPublicId(`"${req.user?.coverImage}"`);
  //console.log(oldCoverImagePath.trim())

  const oldCoverImage = await deleteImageFromCloudinary(
    oldCoverImagePath.trim(),
  );

  if (!oldCoverImage) {
    throw new ApiError(400, "Error while deleting old cover image");
  }

  // uploading cover image local path to cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading cover image");
  }

  // finding user with user id and updating the cover image
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true },
  ).select("-password");

  // returing response
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

export {
  registerUser,
  registerUsingOTP,
  registerWithOTP,
  loginUser,
  loginUsingOTP,
  loginWithOTP,
  logoutUser,
  refreshAccessToken,
  setPassword,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
