import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import Joi from "joi";

/**
 * @middleware `messageValidation`
 * Validates the integrity of incoming chat/mood messages.
 * Ensures 'receiverMessage' is a string with at least 5 characters to provide enough context for AI processing.
 */
const messageValidation = asyncHandler((req, res, next) => {
  const schema = Joi.object({
    receiverMessage: Joi.string().min(5).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    console.log("error", error);
    return res.status(400).json(new ApiError(400, "Bad request: ", error));
  }

  next();
});

export { messageValidation };
