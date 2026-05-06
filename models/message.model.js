import mongoose, { Schema } from "mongoose";
import { chatMessageDb } from "../db/connection.js";

/**
 * @schema `chatMessageSchema`
 * Defines the structure for AI-user interactions and song recommendations.
 * - 'messageType': Restricts values to either "text" or "recommendation".
 * - 'recommendedSongs': An array of strings (Song IDs) suggested by the AI based on context.
 * - 'receiverId': A reference to the 'User' model to identify which user owns this chat history.
 * - 'timestamps': Automatically adds 'createdAt' and 'updatedAt' fields.
 */
const chatMessageSchema = new Schema(
  {
    receiverLastMessage: {
      type: String,
    },
    senderLastMessage: {
      type: String,
    },
    senderMessage: {
      type: String,
    },
    recommendedSongs: [String],
    messageType: {
      type: String,
      enum: ["text", "recommendation"],
      default: "text",
    },
    receiverMessage: {
      type: String,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

/**
 * @model `ChatMessage`
 * Connected via 'chatMessageDb' to keep conversational data separate from core user data.
 */
export const ChatMessage = chatMessageDb.model(
  "ChatMessage",
  chatMessageSchema,
);
