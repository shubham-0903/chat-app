const request = require("supertest");
const app = require("../server");

describe("Health Check API", () => {
  it("should return status 200 and status 'ok'", async () => {
    const res = await request(app).get("/api/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("message", "API server is healthy");
  });
});
