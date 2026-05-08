import request from "supertest";
import { httpServer as app } from "../../app";
import { User as UserModel } from "../../models/user.model.js";
import { jest } from "@jest/globals";
import { ListeningHistory } from "../../models/listeningHistory.model.js";

describe("Song Controller", () => {
  jest.setTimeout(60000);

  describe("get search song results", () => {
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
    });

    it("should return 200 and Song searched Successfully.", async () => {
      const response = await request(app)
        .post("/api/v1/songs/search-song")
        .set("authorization", accessToken)
        .send({
          searchQuery: "Beat It",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  let message;
  describe("get suggested song", () => {
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
    });

    it("should return 200 and Message sent successfully", async () => {
      const response = await request(app)
        .post("/api/v1/messages/send-message")
        .set("authorization", accessToken)
        .send({
          receiverMessage: "Suggest me some mj songs",
        });

      message = response.body.data;
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    }, 15000);
  });

  let song;
  describe("play suggested song", () => {
    let accessToken, refreshToken;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser2@gmail.com",
        password: "1234",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
    });

    it("should return 200 and Successfully found searched songs to play", async () => {
      const response = await request(app)
        .get(`/api/v1/songs/play-suggested-song/${message._id}`)
        .set("authorization", accessToken);

      song = response.body.data;

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    }, 15000);
  });

  describe("play song", () => {
    let accessToken, refreshToken;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser3@gmail.com",
        password: "1234",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
    });

    it("should return 200 and Successfully found song to play", async () => {
      const response = await request(app)
        .get(`/api/v1/songs/play-song/${song[0].id}`)
        .set("authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    }, 15000);
  });

  describe("play next recommended song", () => {
    let accessToken, refreshToken;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser4@gmail.com",
        password: "1234",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
    });

    it("should return 200 and Message sent successfully", async () => {
      const response = await request(app)
        .post(`/api/v1/messages/recommend-song/${song[0].id}`)
        .set("authorization", accessToken)
        .send({
            receiverMessage: "Give me the beach boys songs"
        })

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    }, 15000);
  });

  describe("like song", () => {
    let accessToken, refreshToken;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser5@gmail.com",
        password: "1234",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
    });

    it("should return 200 and Successfully found song to play", async () => {
      const response = await request(app)
        .get(`/api/v1/songs/like-song/${song[0].id}`)
        .set("authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    }, 15000);
  });

  describe("get songs", () => {
    let accessToken, refreshToken;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser6@gmail.com",
        password: "1234",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      await ListeningHistory.create({
        userId: user._id,
        songId: song[0].id,
        playCount: 10,
        isLiked: true
      })

      await ListeningHistory.create({
        userId: user._id,
        songId: song[1].id,
        playCount: 10,
        isLiked: true
      })

      await ListeningHistory.create({
        userId: user._id,
        songId: song[2].id,
        playCount: 10,
        isLiked: true
      })

    });

    it("should return 200 and Successfully found song to play", async () => {
      const response = await request(app)
        .get(`/api/v1/songs/get-song`)
        .set("authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    }, 15000);
  });
});
