const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../server");
const User = require("../src/models/user");
const mongoose = require("mongoose");

describe("User Routes", () => {
  beforeEach(async () => {
    // Clear DB before each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  //  Signup
  it("should create a new user successfully", async () => {
    const res = await request(app)
      .post("/api/user/signup")
      .send({
        name: "Test User",
        email: "test@gmail.com",
        password: "password123",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("User created successfully");
  });

  it("should fail if email already exists", async () => {
    await User.create({ name: "Test User", email: "test@gmail.com", password: "123456" });

    const res = await request(app)
      .post("/api/user/signup")
      .send({
        name: "Test User",
        email: "test@gmail.com",
        password: "123456",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Email already exists");
  });

  it("should fail if any field is missing", async () => {
    const res = await request(app).post("/api/user/signup").send({
      email: "incomplete@example.com",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("All fields are required");
  });

  //  Login
  it("should login successfully with correct credentials", async () => {
    await request(app).post("/api/user/signup").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/user/login").send({
      email: "test@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("should fail login with invalid credentials", async () => {
    const res = await request(app).post("/api/user/login").send({
      email: "notfound@example.com",
      password: "wrong",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid credentials");
  });

  // Profile
  it("should return authorized profile when token is valid", async () => {
    const user = await User.create({
      name: "Auth User",
      email: "auth@example.com",
      password: "password123",
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const res = await request(app)
      .get("/api/user/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Authorized access");
  });

  it("should return 401 for invalid token", async () => {
    const res = await request(app)
      .get("/api/user/profile")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.statusCode).toBe(401);
  });

  //  Logout 
  it("should return logout success message", async () => {
    const res = await request(app).post("/api/user/logout");
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Logged out successfully");
  });
});
