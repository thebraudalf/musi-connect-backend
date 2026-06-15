import request from "supertest";
import { httpServer as app } from "../../app";
import { User as UserModel } from "../../models/user.model.js";
import path from "path";
import { fileURLToPath } from "url";
import { jest } from "@jest/globals";

describe("User Controller", () => {
  jest.setTimeout(60000)

  describe("register user", () => {
    it("should return 201 and User registered successfully", async () => {
      const response = await request(app)
        .post("/api/v1/users/register")
        .set("content-type", "application/json")
        .send({
          fullName: "User User",
          email: "jainnehal456+testUser2@gmail.com",
          password: "12345",
          username: "user1234",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("data");
    });

    it("should return an error if user already exists", async () => {
      const res = await request(app)
        .post("/api/v1/users/register")
        .set("content-type", "application/json")
        .send({
          fullName: "User User",
          email: "jainnehal456+testUser2@gmail.com",
          password: "12345",
          username: "user123",
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toEqual("Email or username already exists");
    });
  });

  let OTP;
  describe("register using OTP", () => {
    it("should return 200 and OTP sent successfully", async () => {
      const response = await request(app)
        .post("/api/v1/users/register-using-otp")
        .set("content-type", "application/json")
        .send({
          email: "jainnehal456+testUser3@gmail.com",
        });

        OTP = response.body.data;

      expect(response.status).toBe(201);
    });
  });

  describe("register with OTP", () => {
    it("should return 200 and User registered Successfully", async () => {
      const response = await request(app)
        .post("/api/v1/users/register-with-otp")
        .set("content-type", "application/json")
        .send({
          email: "jainnehal456+testUser3@gmail.com",
          OTP: OTP,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("login user", () => {
    it("should return 200 and User logged In Successfully", async () => {
      const response = await request(app)
        .post("/api/v1/users/login")
        .set("content-type", "application/json")
        .send({
          email: "jainnehal456+testUser2@gmail.com",
          password: "12345",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("login using OTP", () => {
    it("should return 200 and OTP sent successfully", async () => {
      const response = await request(app)
        .post("/api/v1/users/login-using-otp")
        .set("content-type", "application/json")
        .send({
          email: "jainnehal456+testUser3@gmail.com",
        });

      OTP = response.body.data;

      expect(response.status).toBe(201);
    });
  });

  describe("login with OTP", () => {
    it("should return 200 and User logged In Successfully", async () => {
      const response = await request(app)
        .post("/api/v1/users/login-with-otp")
        .set("content-type", "application/json")
        .send({
          email: "jainnehal456+testUser3@gmail.com",
          OTP: OTP,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("get current user", () => {
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
   
    it("should return 200 and User fetched successfully", async () => {
      const response = await request(app)
        .get(`/api/v1/users/current-user`)
        .set("content-type", "application/json")
        .set("authorization", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("log out user", () => {
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

    it("should return 200 and User Logged Out successfully", async () => {
      const response = await request(app)
        .post(`/api/v1/users/logout`)
        .set("authorization", accessToken)

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("set password for email", () => {
    let accessToken, refreshToken;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser6@gmail.com",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
    });

    it("should return 200 and Password for this email has been created successfully", async () => {
      const response = await request(app)
        .post(`/api/v1/users/set-password`)
        .set("content-type", "application/json")
        .set("authorization", accessToken)
        .send({
          newPassword: "234343",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toEqual(
        "Password for this email has been created successfully",
      );
    });
  });

  describe("change password for email", () => {
    let accessToken, refreshToken;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser7@gmail.com",
        password: "1234"
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
    });

    it("should return 200 and Password changed successfully", async () => {
      const response = await request(app)
        .post(`/api/v1/users/change-password`)
        .set("content-type", "application/json")
        .set("authorization", accessToken)
        .send({
          oldPassword: "1234",
          newPassword: "234343"
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toEqual("Password changed successfully");
    });
  });

  describe("update account details", () => {
    let accessToken, refreshToken;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser8@gmail.com",
        username: "user1234",
        fullName: "User User Again",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
    });

    it("should return 200 and Account details updated successfully", async () => {
      const response = await request(app)
        .patch(`/api/v1/users/update-account`)
        .set("content-type", "application/json")
        .set("authorization", accessToken)
        .send({
          username: "username",
          fullName: "fullName",
          email: "jainnehal456+testUser9@gmail.com"
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("update avatar image", () => {
    let accessToken, refreshToken;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser10@gmail.com",
        username: "user1234",
        fullName: "User User Again",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
    });

    it("should return 200 and Avatar image updated successfully", async () => {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const filePath = path.resolve(__dirname, "..", "public", "pexels-nexarostudio-36746402.jpg")

      const response = await request(app)
        .patch(`/api/v1/users/avatar`)
        .set("Authorization", `Bearer ${accessToken}`)
        .attach("avatar", filePath);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('avatar');
    }, 15000);
  });

  describe("update cover image", () => {
    let accessToken, refreshToken;
    beforeEach(async () => {
      const user = await UserModel.create({
        email: "jainnehal456+testUser11@gmail.com",
        username: "user1234",
        fullName: "User User Again",
      });
      accessToken = user.generateAccessToken();
      refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
    });

    it("should return 200 and Avatar image updated successfully", async () => {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const filePath = path.resolve(
        __dirname,
        "..",
        "public",
        "pexels-nexarostudio-36746402.jpg",
      );

      const response = await request(app)
        .patch(`/api/v1/users/cover-image`)
        .set("authorization", accessToken)
        .attach("coverImage", filePath);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("coverImage");
    }, 15000);
  });
});
