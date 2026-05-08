import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { searchaSong } from "../utils/seeds/musicSeed/song.seed.js";
import { ListeningHistory } from "../models/listeningHistory.model.js";

/**
 * @middleware `searchSong`
 * Validates the integrity of search query.
 * Ensures 'searchQuery' is a string with at least 5 characters to provide enough context to get search results.
 * pass the search song results to `getSearchSongResults` function.
 */
const searchSong = asyncHandler(async (req, res, next) => {
  // Step 1: get req details
  // Step 2: call searchSong func to get song meta data
  // Step 3: return res
  // Step 4: pass the middleware

  try {
    // getting request details
    const { searchQuery } = req.body;

    // checking if the searchQuery is present in the request body
    if (!searchQuery) {
      throw new ApiError(400, "search query is required!");
    }

    // calling searchSong function to get song meta data
    const songResponse = await searchaSong(searchQuery, 10);

    if (!songResponse) {
      throw new ApiError(400, "Unable to search song");
    }

    req.songResponse = songResponse;
    next();
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", error.message));
  }
});

export { searchSong };
