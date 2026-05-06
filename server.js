import dotenv from "dotenv";
import {
  userDb,
  chatMessageDb,
  listeningHistoryDb,
} from "./db/connection.js";
import { httpServer } from "./app.js";

dotenv.config();

// connecting to MongoDB and setting up server
const startServer = async () => {
  try {
    // Wait for connections to establish
    await Promise.all([
      userDb.asPromise(),
      chatMessageDb.asPromise(),
      listeningHistoryDb.asPromise(),
    ]);

    httpServer.listen(process.env.PORT || 8000, () => {
      console.log(`Server running. Multi-DB connections established.`);
    });
  } catch (error) {
    console.error("Failed to connect to databases", error);
  }
};

startServer();
