import request from "supertest";
import { httpServer as app } from "../../app";
import { User as UserModel } from "../../models/user.model.js";
import { jest } from "@jest/globals";
import { ChatMessage } from "../../models/message.model.js";

describe("Message Controller", () => {
  jest.setTimeout(60000);

  describe("get messages", () => {
    let accessToken, refreshToken;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser@gmail.com",
        password: "1234",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      await ChatMessage.create({
        receiverId: user._id.toHexString(),
        receiverMessage: "Suggest me mj songs to play",
        receiverLastMessage: "Suggest me mj songs to play",
        senderMessage: "This is the curated list of songs to play",
        senderLastMessage: "This is the curated list of songs to play",
      });

      await ChatMessage.create({
        receiverId: user._id.toHexString(),
        receiverMessage: "Suggest me elvis presley songs to play",
        receiverLastMessage: "Suggest me elvis presley songs to play",
        senderMessage: "This is the curated list of songs to play",
        senderLastMessage: "This is the curated list of songs to play",
      });

      await ChatMessage.create({
        receiverId: user._id.toHexString(),
        receiverMessage: "Suggest me the beach boys songs to play",
        receiverLastMessage: "Suggest me  the beach boys songs to play",
        senderMessage: "This is the curated list of songs to play",
        senderLastMessage: "This is the curated list of songs to play",
      });
    });

    it("should return 200 and Messages retrieved successfully", async () => {
      const response = await request(app)
        .get("/api/v1/messages/get-messages")
        .set("authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("get last message", () => {
    let accessToken, refreshToken;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser1@gmail.com",
        password: "1234",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      await ChatMessage.create({
        receiverId: user._id.toHexString(),
        receiverMessage: "Suggest me mj songs to play",
        receiverLastMessage: "Suggest me mj songs to play",
        senderMessage: "This is the curated list of songs to play",
        senderLastMessage: "This is the curated list of songs to play",
      });
    });

    it("should return 200 and Messages retrieved successfully", async () => {
      const response = await request(app)
        .get("/api/v1/messages/get-last-message")
        .set("authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("get message", () => {
    let accessToken, refreshToken, message;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser2@gmail.com",
        password: "1234",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      message = await ChatMessage.create({
        receiverId: user._id.toHexString(),
        receiverMessage: "Suggest me mj songs to play",
        receiverLastMessage: "Suggest me mj songs to play",
        senderMessage: "This is the curated list of songs to play",
        senderLastMessage: "This is the curated list of songs to play",
      });
    });

    it("should return 200 and Messages retrieved successfully", async () => {
      const response = await request(app)
        .get(`/api/v1/messages/get-message/${message._id}`)
        .set("authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("delete receiver message", () => {
    let accessToken, refreshToken, message;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser3@gmail.com",
        password: "1234",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      message = await ChatMessage.create({
        receiverId: user._id.toHexString(),
        receiverMessage: "Suggest me mj songs to play",
        receiverLastMessage: "Suggest me mj songs to play",
        senderMessage: "This is the curated list of songs to play",
        senderLastMessage: "This is the curated list of songs to play",
      });
    });

    it("should return 200 and Receiver Message deleted successfully", async () => {
      const response = await request(app)
        .delete(`/api/v1/messages/delete-receiver-message/${message._id}`)
        .set("authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.message).toEqual("Receiver Message deleted successfully");
    });
  });

  describe("delete sender message", () => {
    let accessToken, refreshToken, message;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser4@gmail.com",
        password: "1234",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      message = await ChatMessage.create({
        receiverId: user._id.toHexString(),
        receiverMessage: "Suggest me mj songs to play",
        receiverLastMessage: "Suggest me mj songs to play",
        senderMessage: "This is the curated list of songs to play",
        senderLastMessage: "This is the curated list of songs to play",
      });
    });

    it("should return 200 and Sender Message deleted successfully", async () => {
      const response = await request(app)
        .delete(`/api/v1/messages/delete-sender-message/${message._id}`)
        .set("authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.message).toEqual("Sender Message deleted successfully");
    });
  });
});
