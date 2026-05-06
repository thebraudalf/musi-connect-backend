import { Router } from 'express';
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { messageValidation } from '../middlewares/message.middleware.js';
import { upload } from "../middlewares/multer.middleware.js";
import { playNextRecommendedSong, getSuggestedSong } from '../controllers/song.controller.js';
import { sendMessage, recommendSongMessage, getAllMessages, getMessage, getLastMessage, deleteReceiverMessage, deleteSenderMessage } from '../controllers/message.controller.js';
import { globalLimiter, aiGenerationLimiter } from "../middlewares/rateLimiter.middleware.js"

const router = Router();

/**
 * Express Router setup for message-related endpoints.
 * * Middleware Execution Order:
 * 1. globalLimiter: Prevents API abuse across all song-related endpoints.
 * 2. aiGenerationLimiter: Ensures strict limitation for authentication or AI generation.
 * 3. messageValidation: Ensures incoming text/body data is formatted correctly.
 * 4. upload.none(): Standardizes multipart/form-data handling without saving files.
 * 5. verifyJWT: Authenticates the user and attaches 'req.user' to the request.
 * 6. playSuggestedSong / playNextRecommendedSong: AI Logic that prepares recommendations.
 * 7. sendMessage / recommendSongMessage: Final controllers that save data and send the response.
 */

router.use(globalLimiter);


// POST /send-message: Processes a user's mood/query and suggests 20 songs.
router.post('/send-message', aiGenerationLimiter, messageValidation, upload.none(), verifyJWT, getSuggestedSong, sendMessage);
// POST /recommend-song/:songId: Uses a specific song context to recommend 5 next songs.
router.post('/recommend-song/:songId', aiGenerationLimiter, messageValidation, upload.none(), verifyJWT, playNextRecommendedSong, recommendSongMessage);
// GET /get-messages: Retrieves chat history for the authenticated user.
router.get('/get-messages', verifyJWT, getAllMessages);
// GET /get-message: Retrieves chat for the authenticated user.
router.get('/get-message/:messageId', verifyJWT, getMessage);
// GET /get-last-message: Retrieves last chat for the authenticated user.
router.get('/get-last-message', verifyJWT, getLastMessage);
// DELETE /delete-receiver-message/:messageId: Clears receiver message with a specific contact.
router.delete('/delete-receiver-message/:messageId', verifyJWT, deleteReceiverMessage);
// DELETE /delete-sender-message/:messageId: Clears sender message with a specific contact.
router.delete('/delete-sender-message/:messageId', verifyJWT, deleteSenderMessage);

export default router;
