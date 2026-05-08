import { jest } from "@jest/globals";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { userDb, chatMessageDb, listeningHistoryDb } from "../db/connection.js";


let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // CRITICAL: Manually open the connections to the memory server URI
  // This overrides the initial "undefined" or fallback connection
  const connections = await Promise.all([
    userDb.openUri(uri, {
      dbName: "userDb",
       maxPoolSize: 2000
    }),
    chatMessageDb.openUri(uri, {
      dbName: "chatMessageDb",
       maxPoolSize: 2000
    }),
    listeningHistoryDb.openUri(uri, {
      dbName: "listeningHistoryDb",
       maxPoolSize: 2000
    }),
  ]);

  console.log(`MongoDB connected to ${connections[0].db.databaseName}`);
  console.log(`MongoDB connected to ${connections[1].db.databaseName}`);
  console.log(`MongoDB connected to ${connections[2].db.databaseName}`);
});

afterEach(async () => {
  // Clear all databases
  const dbs = [userDb, chatMessageDb, listeningHistoryDb];
  for (const db in dbs) {
    // Check if connection is still open before trying to clear it
    if (db.readyState === 1) {
      const collections = db.collections;
      for (const key in collections) {
        await collections[key].deleteMany({}); // Added {} for safety
      }
    }
  }
});

afterAll(async () => {
  try {
    // STEP 1: Close all specific connection pools
    // This stops new checkouts from the pool
    await Promise.all([
      userDb.close(),
      chatMessageDb.close(),
      listeningHistoryDb.close(),
    ]);

    // STEP 2: Disconnect the global mongoose instance
    await mongoose.disconnect();

    // STEP 3: Finally, kill the database process
    if (mongod) {
      await mongod.stop();
    }
  } catch (error) {
    console.error("Cleanup Error:", error);
  }
}, 500);
