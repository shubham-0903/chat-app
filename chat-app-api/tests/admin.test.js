const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../server");
const InternalUser = require("../src/models/internalUser");
const mongoose = require("mongoose");

describe("Admin Routes", () => {
  beforeEach(async () => {
    await InternalUser.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  //  Login 
  it("should login successfully with correct credentials", async () => {
    await InternalUser.create({
      name: "Admin",
      email: "admin@gmail.com",
      password: "admin123",
    });

    const res = await request(app)
      .post("/api/admin/login")
      .send({
        email: "admin@gmail.com",
        password: "admin123",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("admin@gmail.com");
  });

  it("should fail login with invalid credentials", async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({
        email: "admin@gmail.com",
        password: "wrongpassword",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("should fail if email or password is missing", async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: "admin@gmail.com" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Email and password are required");
  });

  //  Profile 
  it("should return authorized profile for valid token", async () => {
    const admin = await InternalUser.create({
      name: "Admin User",
      email: "authadmin@gmail.com",
      password: "admin123",
    });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const res = await request(app)
      .get("/api/admin/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Authorized access");
    expect(res.body).toHaveProperty("user");
  });

  it("should return 401 for invalid token", async () => {
    const res = await request(app)
      .get("/api/admin/profile")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.statusCode).toBe(401);
  });

  // Logout 
  it("should return logout success message", async () => {
    const res = await request(app).post("/api/admin/logout");

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Logged out successfully");
  });
});
