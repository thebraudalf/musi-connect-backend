import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { userDb } from "../db/connection.js";

/**
 * @schema `userSchema`
 * Core user profile schema including security and authentication fields.
 * - 'OTP/OTPAttempts/blockUntil': Fields used to manage secure login and brute-force protection.
 * - 'refreshToken': Stored on the user document to allow persistent sessions and token rotation.
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String, // url
    },
    coverImage: {
      type: String, // url
    },
    OTP: { type: String },
    OTPCreatedTime: { type: Date },
    OTPAttempts: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    blockUntil: { type: Date },
    password: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true },
);

/**
 * @middleware pre("save")
 * Automatically runs before a user document is saved.
 * If the password has been changed, it encrypts (hashes) it using bcrypt with a salt factor of 10.
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/**
 * @method isPasswordCorrect
 * Compares a plain-text password from a login request with the hashed password in the database.
 */
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

/**
 * @method generateAccessToken
 * Signs a short-lived JWT (Access Token) containing user identity for authorization.
 */
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );
};

/**
 * @method generateRefreshToken
 * Signs a long-lived JWT (Refresh Token) used specifically to generate new access tokens without re-logging.
 */
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    },
  );
};

/**
 * @model `User`
 * Finalized User model connected to the 'userDb' instance.
 */
export const User = userDb.model("User", userSchema);
