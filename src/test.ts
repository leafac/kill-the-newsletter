import { app } from "./server";
import { feedPath } from "./components";
import request from "supertest";
import fs from "fs";

test("create feed", async () => {
  const response = await request(app)
    .post("/")
    .send("name=My Feed");
  const token = response.text.match(/(\w{20}).xml/)![1];
  const feed = fs.readFileSync(feedPath(token)).toString();

  expect(feed).toMatch("My Feed");
});
