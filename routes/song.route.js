import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { searchValidation } from "../middlewares/search.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { searchSong } from "../middlewares/song.middleware.js";
import {
  getSearchSongResults,
  getSongs,
  playSong,
  playSuggestedSong,
  toggleLikeSong,
} from "../controllers/song.controller.js";
import { globalLimiter, aiGenerationLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

/**
 * Routing Configuration for Music Discovery and Playback.
 * * * Middleware Logic:
 * - globalLimiter: Prevents API abuse across all song-related endpoints.
 * - verifyJWT: Ensures only authenticated users can access music features.
 */
router.use(globalLimiter);

// POST /search-song: Orchestrates the search flow.
// 1. Validates search terms (searchValidation).
// 2. Extracts song data from external APIs (searchSong middleware).
// 3. Saves results to local DB and returns them (getSearchSongResults).
router.post(
  "/search-song",
  searchValidation,
  upload.none(),
  verifyJWT,
  searchSong,
  getSearchSongResults,
);
// GET /play-song/:songId: Handles the playback request and updates listening history.
router.get("/play-song/:songId", verifyJWT, playSong);
// GET /get-song: Retrieves the song library.
router.get("/get-song", aiGenerationLimiter, verifyJWT, getSongs);
// GET /like-song/:songId: Toggles the 'isLiked' status for a specific song.
router.get("/like-song/:songId", verifyJWT, toggleLikeSong);
// GET /play-suggested-song/:messageId: Handles the playback request of suggested songs.
router.get("/play-suggested-song/:messageId", verifyJWT, playSuggestedSong);

export default router;
