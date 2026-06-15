import mongoose, { Schema } from "mongoose";
import { listeningHistoryDb } from "../db/connection.js";

/**
 * @schema listeningHistorySchema
 * Tracks user interaction with specific songs to build personalized recommendations.
 * - 'eventType': Categorizes the action (e.g., "play", "skip").
 * - 'playCount': An incrementing counter reflecting how many times a user has heard a song.
 * - 'isLiked': A boolean toggle for user favorites.
 * - 'lastPlayed': A timestamp to track recency for "Recently Played" lists.
 */
const listeningHistorySchema = new Schema({
  eventType: {
    type: String,
  },
  userId: {
    type: String,
  },
  songId: {
    type: String,
  },

  playCount: {
    type: Number,
    default: 0,
  },
  isLiked: {
    type: Boolean,
    default: false,
  },
  lastPlayed: {
    type: Date,
  },
});

/**
 * @model `ListeningHistory`
 * Uses a dedicated database connection 'listeningHistoryDb' to store analytics data.
 */
export const ListeningHistory = listeningHistoryDb.model(
  "ListeningHistory",
  listeningHistorySchema,
);
