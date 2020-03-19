import { webServer, redirectServer, feedPath } from ".";
import fetch from "node-fetch";
import fs from "fs";

test("webServer", async () => {
  const response = await fetch("http://localhost:8443", {
    method: "POST",
    body: new URLSearchParams({ name: "My Feed" })
  });
  const responseText = await response.text();
  const token = responseText.match(/(\w{20}).xml/)![1];
  const feed = fs.readFileSync(feedPath(token)).toString();

  expect(feed).toMatch("My Feed");
});

test("redirectServer", async () => {
  const response = await fetch("http://localhost:8080/something?other", {
    redirect: "manual"
  });
  expect(response.status).toBe(301);
  expect(response.headers.get("Location")).toBe(
    "https://www.kill-the-newsletter.com/something?other"
  );
});

afterAll(() => {
  webServer.close();
  redirectServer.close();
});
