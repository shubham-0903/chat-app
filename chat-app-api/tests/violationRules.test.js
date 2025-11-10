const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../server");
const ViolationRule = require("../src/models/ViolationRule");

// Mock admin middleware 
jest.mock("../src/middleware/authMiddleware", () => ({
  adminAuthMiddleware: (req, res, next) => next(),
  authMiddleware: (req, res, next) => next(),
}));

describe("Violation Rules Routes", () => {
  beforeEach(async () => {
    await ViolationRule.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Create Rule
  it("should create a new violation rule", async () => {
    const res = await request(app)
      .post("/api/violation-rules")
      .send({
        type: "offensive",
        words: ["badword1", "badword2"],
        message: "Inappropriate language detected",
        isActive: true,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.type).toBe("offensive");
    expect(res.body.words).toHaveLength(2);
    expect(res.body.isActive).toBe(true);
  });

  //  Get All Rules 
  it("should return all violation rules", async () => {
    await ViolationRule.create({
      type: "spam",
      words: ["spamword"],
      message: "Spam detected",
    });

    await ViolationRule.create({
      type: "spam2",
      words: ["spamword"],
      message: "Spam detected 2",
    });

    const res = await request(app).get("/api/violation-rules");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[1].type).toBe("spam");
    expect(res.body[0].type).toBe("spam2");
  });

  // Get Rule by ID
  it("should get a violation rule by ID", async () => {
    const rule = await ViolationRule.create({
      type: "test",
      words: ["abc"],
      message: "Test rule",
    });

    const res = await request(app).get(`/api/violation-rules/${rule._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Test rule");
  });

  it("should return 404 if rule not found", async () => {
    const res = await request(app).get(`/api/violation-rules/${new mongoose.Types.ObjectId()}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Rule not found");
  });

  //  Update Rule
  it("should update a violation rule", async () => {
    const rule = await ViolationRule.create({
      type: "initial",
      words: ["a"],
      message: "Old message",
    });

    const res = await request(app)
      .put(`/api/violation-rules/${rule._id}`)
      .send({ message: "Updated message" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Updated message");
  });

  it("should return 404 if updating non-existent rule", async () => {
    const res = await request(app)
      .put(`/api/violation-rules/${new mongoose.Types.ObjectId()}`)
      .send({ message: "Updated" });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Rule not found");
  });

  // Delete Rule
  it("should delete a violation rule", async () => {
    const rule = await ViolationRule.create({
      type: "delete",
      words: ["x"],
      message: "Remove me",
    });

    const res = await request(app).delete(`/api/violation-rules/${rule._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Rule deleted successfully");
  });

  it("should return 404 if deleting non-existent rule", async () => {
    const res = await request(app).delete(`/api/violation-rules/${new mongoose.Types.ObjectId()}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Rule not found");
  });
});
