import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Helper function to create a connection
const makeNewConnection = (uri, dbName) => {

    if (process.env.NODE_ENV === "test") {
    // Return a "disconnected" connection instance that we will open later in bootstrap.js
    return mongoose.createConnection(); 
    }

    const db = mongoose.createConnection(`${uri}`, {
        dbName: dbName,
    });

    db.on("connected", () => console.log(`MongoDB connected to ${dbName}`));
    db.on("error", (err) => console.log(`MongoDB ${dbName} connection FAILED`, err));

    return db;
};


export const userDb = makeNewConnection(process.env.MONGODB_URI, "User");
export const chatMessageDb = makeNewConnection(process.env.MONGODB_URI, "Chat-Message");
export const listeningHistoryDb = makeNewConnection(process.env.MONGODB_URI, "Listening-History");
