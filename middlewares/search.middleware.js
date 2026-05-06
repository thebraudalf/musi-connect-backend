import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import Joi from "joi";

/**
 * @middleware `searchValidation`
 * Validates the integrity of search songs.
 * Ensures 'searchQuery' is a string with at least 5 characters to provide enough context to get search results.
 */
const searchValidation = asyncHandler((req, res, next) => {
  const schema = Joi.object({
    searchQuery: Joi.string().min(5),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    console.log("error", error);
    return res.status(400).json(new ApiError(400, "Bad request: ", error));
  }

  next();
});

export { searchValidation };
