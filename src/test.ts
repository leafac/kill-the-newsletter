import { developmentWebServer, emailServer, feedPath } from ".";
import fetch from "node-fetch";
import fs from "fs";

test("create feed", async () => {
  const token = await createFeed();
  const feed = fs.readFileSync(feedPath(token)).toString();

  expect(feed).toMatch("My Feed");
});

test("receive email", async () => {
  const token = await createFeed();
})

afterAll(() => {
  developmentWebServer.close();
  emailServer.close(() => {});
});

async function createFeed(): Promise<string> {
  const response = await fetch("http://localhost:8000", {
    method: "POST",
    body: new URLSearchParams({ name: "My Feed" })
  });
  const responseText = await response.text();
  return responseText.match(/(\w{20}).xml/)![1];
}
