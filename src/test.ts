import {
  developmentWebServer,
  developmentEmailServer,
  feedPath,
  feedEmail
} from ".";
import nodemailer from "nodemailer";
import fetch from "node-fetch";
import fs from "fs";

test("create feed", async () => {
  const token = await createFeed();

  expect(readFeed(token)).toMatch("My Feed");
});

describe("receive email", () => {
  const transporter = nodemailer.createTransport({
    host: "localhost",
    port: 2525,
    tls: { rejectUnauthorized: false }
  });

  test("HTML content", async () => {
    const token = await createFeed();
    await transporter.sendMail({
      from: "publisher@example.com",
      to: feedEmail(token),
      subject: "New Message",
      html: "<p>HTML content</p>"
    });
    const feed = readFeed(token);
    expect(feed).toMatch("publisher@example.com");
    expect(feed).toMatch("New Message");
    expect(feed).toMatch("HTML content");
  });

  test("text content", async () => {
    const token = await createFeed();
    await transporter.sendMail({
      from: "publisher@example.com",
      to: feedEmail(token),
      subject: "New Message",
      text: "TEXT content"
    });
    const feed = readFeed(token);
    expect(feed).toMatch("TEXT content");
  });

  test("truncation", async () => {
    const token = await createFeed();
    for (const repetition of [...new Array(4).keys()])
      await transporter.sendMail({
        from: "publisher@example.com",
        to: feedEmail(token),
        subject: "New Message",
        text: `REPETITION ${repetition} `.repeat(10_000)
      });
    const feed = readFeed(token);
    expect(feed).toMatch("REPETITION 3");
    expect(feed).not.toMatch("REPETITION 0");
  }, 10_000);
});

afterAll(() => {
  developmentWebServer.close();
  developmentEmailServer.close(() => {});
});

async function createFeed(): Promise<string> {
  const response = await fetch("http://localhost:8000", {
    method: "POST",
    body: new URLSearchParams({ name: "My Feed" })
  });
  const responseText = await response.text();
  return responseText.match(/(\w{20}).xml/)![1];
}

function readFeed(token: string): string {
  return fs.readFileSync(feedPath(token), "utf8");
}
