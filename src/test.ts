import { app } from "./server";
import request from "supertest";

test("create feed", async () => {
  const response = await request(app)
    .post("/")
    .send({ name: "My Feed" });
  JSON.stringify(response, null, 2);
});
