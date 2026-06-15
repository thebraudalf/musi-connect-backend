import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken";
import Joi from "joi";


/**
 * @middleware `registerValidation`
 * Validates the request body for new user registration.
 * Checks for a valid username, fullName, email, and password using Joi schema.
 */
const registerValidation = asyncHandler((req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(100).required(),
    fullName: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(4).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    console.log("error", error);
    return res.status(400).json(new ApiError(400, "Bad request: ", error));
  }

  next();
});

/**
 * @middleware `registerUsingOTPValidation`
 * Validates the initial step of OTP-based registration.
 * Ensures the 'email' field is present and correctly formatted before sending an OTP.
 */
const registerUsingOTPValidation = asyncHandler((req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    console.log("error", error);
    return res.status(400).json(new ApiError(400, "Bad request: ", error));
  }

  next();
});

/**
 * @middleware `registerWithOTPValidation`
 * Validates the final step of OTP registration.
 * Ensures both the 'email' and the 'OTP' string are provided to complete the sign-up process.
 */
const registerWithOTPValidation = asyncHandler((req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    OTP: Joi.string().min(1).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    console.log("error", error);
    return res.status(400).json(new ApiError(400, "Bad request: ", error));
  }

  next();
});

/**
 * @middleware `loginValidation`
 * Validates traditional login credentials.
 * Checks for either an email or username alongside a required password.
 */
const loginValidation = asyncHandler((req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email(),
    username: Joi.string().min(3).max(100),
    password: Joi.string().min(4).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiError(400, "Bad request: ", error));
  }

  next();
});

/**
 * @middleware `loginUsingOTPValidation`
 * Validates the request to initiate an OTP login.
 * Requires a valid email or username to identify the user before generating an OTP.
 */
const loginUsingOTPValidation = asyncHandler((req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email(),
    username: Joi.string().min(3).max(100),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiError(400, "Bad request: ", error));
  }

  next();
});

/**
 * @middleware `loginWithOTPValidation`
 * Validates the verification step of OTP login.
 * Checks for the identifier (email/username) and the OTP code provided by the user.
 */
const loginWithOTPValidation = asyncHandler((req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email(),
    username: Joi.string().min(3).max(100),
    OTP: Joi.string().min(1).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    console.log("error", error);
    return res.status(400).json(new ApiError(400, "Bad request: ", error));
  }

  next();
});

/**
 * @middleware setPasswordValidation
 * Validates the 'newPassword' field during initial password setup or reset.
 */
const setPasswordValidation = asyncHandler((req, res, next) => {
  const schema = Joi.object({
    newPassword: Joi.string().min(4).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiError(400, "Bad request: ", error));
  }

  next();
});

/**
 * @middleware changeCurrentPasswordValidation
 * Validates the payload for password updates.
 * Ensures the user provides both the 'oldPassword' (for security) and a valid 'newPassword'.
 */
const changeCurrentPasswordValidation = asyncHandler((req, res, next) => {
  const schema = Joi.object({
    oldPassword: Joi.string().min(4).required(),
    newPassword: Joi.string().min(4).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiError(400, "Bad request: ", error));
  }

  next();
});

/**
 * @middleware updateAccountDetailsValidation
 * Validates updates to basic profile information.
 * Ensures the new 'username', 'fullName', and 'email' meet length and format requirements.
 */
const updateAccountDetailsValidation = asyncHandler((req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(100).required(),
    fullName: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiError(400, "Bad request: ", error));
  }

  next();
});

/**
 * @middleware verifyJWT
 * Authentication Guard: Protects private routes.
 * 1. Extracts the token from either browser cookies or the Authorization Bearer header.
 * 2. Verifies the token's signature using the secret key.
 * 3. Fetches the user from the database and attaches it to the 'req' object, excluding sensitive fields.
 */
const verifyJWT = asyncHandler(async (req, _, next) => {
  // Step 1: get access token from cookies and from header
  // Step 2: check if is there any token
  // Step 3: decode token to verify
  // Step 4: remove password and access token from db
  // Step 5: req user

  try {
    // getting access token from cookies and from authorization header
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    //console.log(token);

    // checking if is there any token
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    // decoding token to verify
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // removing password and access token from db
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken",
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    //console.log(error);
    throw new ApiError(401, error?.message || "Invalid access Token");
  }
});

export {
  registerValidation,
  registerUsingOTPValidation,
  registerWithOTPValidation,
  loginValidation,
  loginUsingOTPValidation,
  loginWithOTPValidation,
  setPasswordValidation,
  changeCurrentPasswordValidation,
  updateAccountDetailsValidation,
  verifyJWT,
};
