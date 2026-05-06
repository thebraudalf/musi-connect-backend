import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Server } from "socket.io";
import { createServer } from "http";
import { initializeSocketIO } from "./utils/socket/index.js";

const app = express();

/**
 * @constant httpServer
 * Creates an HTTP server instance using the Express 'app'. 
 * This is necessary to integrate Socket.io with the same port as the web server.
 */
const httpServer = createServer(app);

/**
 * @constant io
 * Initializes the Socket.io Server with specific configurations:
 * - 'pingTimeout': Sets how long the server waits for a client response before closing the connection.
 * - 'cors': Restricts socket access to the authorized 'CORS_ORIGIN' for security.
 */
const io = new Server(httpServer, {
    pingTimeout: 60000,
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    },
});

app.set("io", io); // using set method to mount the `io` instance on the app to avoid usage of `global

// Global Middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.static("public"));
app.use(cookieParser());

/**
 * @section Routes
 * Defines the API versioning (v1) and maps specific URL paths to their respective routers:
 * - '/api/v1/users': Handles registration, login, and profile management.
 * - '/api/v1/messages': Manages AI-chat interactions and song recommendations.
 * - '/api/v1/songs': Handles song fetching, searching, and metadata.
 */
import userRouter from "./routes/user.route.js";
import messageRouter from "./routes/message.route.js";
import songRouter from "./routes/song.route.js";


app.use("/api/v1/users", userRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/songs", songRouter);

initializeSocketIO(io); // initialize the socket io

export { httpServer }
