import { rateLimit } from "express-rate-limit";
import { ApiError } from "../utils/ApiError.js";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per window
  standardHeaders: "draft-7", // combined RateLimit header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    throw new ApiError(429, "Too many requests, please try again later.");
  },
});

// Strict limiter for authentication or AI generation
export const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // Only 10 AI recommendations per hour
  message: "AI budget exceeded for this hour. Slow down!",
});
