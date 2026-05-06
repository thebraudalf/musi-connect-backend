import cookie from "cookie";
import jwt from "jsonwebtoken";
import { ApiError } from "../ApiError.js";
import { Server } from "socket.io";
import { User } from "../../models/user.model.js";
import { ChatEventEnum } from "../../constants.js";

/**
 * @function initializeSocketIO
 * Configures the primary Socket.io connection logic and authentication handshake.
 * 
 * @process `Authentication:`
 * 1. Parses cookies from 'socket.handshake.headers' to find the 'accessToken'.
 * 2. Falls back to checking 'socket.handshake.auth.token' if cookies are missing.
 * 3. Verifies the JWT and retrieves the user from the database, attaching it to 'socket.user'.
 * 
 * @process `Room Management:`
 * 1. Automatically makes the socket join a room named after the User's ID.
 * 2. This allows targeted events (like notifications) to reach the user even without an active chat.
 * 
 * @events
 * - 'CONNECTED_EVENT': Emitted to the client upon successful authentication.
 * - 'DISCONNECT_EVENT': Triggers cleanup, ensuring the user leaves their private ID room.
 * - 'SOCKET_ERROR_EVENT': Sends descriptive error messages back to the client if the handshake fails.
 */
const initializeSocketIO = (io) => {
    return io.on("connection", async (socket) => {
        try {
            // parse the cookies from the handshake headers (This is only possible if client has `withCredentials: true`)
            const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

            let token = cookies?.accessToken; // get the accessToken

            if (!token) {
                // If there is no access token in cookies. Check inside the handshake auth
                token = socket.handshake.auth?.token;
            }

            if (!token) {
                // Token is required for the socket to work
                throw new ApiError(401, "Un-authorized handshake. Token is missing");
            }

            const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); // decode the token

            const user = await User.findById(decodedToken?._id).select(
                "-password -refreshToken"
            );

            // retrieve the user
            if (!user) {
                throw new ApiError(401, "Un-authorized handshake. Token is invalid");
            }
            socket.user = user; // mount te user object to the socket

            // We are creating a room with user id so that if user is joined but does not have any active chat going on.
            // still we want to emit some socket events to the user.
            // so that the client can catch the event and show the notifications.
            socket.join(user._id.toString());
            socket.emit(ChatEventEnum.CONNECTED_EVENT); // emit the connected event so that client is aware
            console.log("User connected 🗼. userId: ", user._id.toString());

            socket.on(ChatEventEnum.DISCONNECT_EVENT, () => {
                console.log("user has disconnected 🚫. userId: " + socket.user?._id);
                if (socket.user?._id) {
                    socket.leave(socket.user._id);
                }
            });
        } catch (error) {
            console.log(error);
            socket.emit(
                ChatEventEnum.SOCKET_ERROR_EVENT,
                error?.message || "Something went wrong while connecting to the socket."
            );
        }
    });
};

/**
 * @function emitSocketEvent
 * A global utility for triggering socket events from standard Express controllers.
 * 
 * @param {Object} req - The Express request object, used to access the 'io' instance via 'req.app.get("io")'.
 * @param {string} userId - The target user's ID (the room name) to receive the message.
 * @param {string} event - The name of the event to emit (defined in ChatEventEnum).
 * @param {any} payload - The data associated with the event.
 */
const emitSocketEvent = (req, userId, event, payload) => {
    req.app.get("io").to(userId).emit(event, payload);
};

export { initializeSocketIO, emitSocketEvent };