import {
  developmentWebServer,
  developmentEmailServer,
  feedPath,
  feedEmail
} from ".";
import nodemailer from "nodemailer";
import axios from "axios";
import qs from "qs";
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
  // FIXME: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/43268
  developmentEmailServer.close(() => {});
});

async function createFeed(): Promise<string> {
  return (
    await axios.post(
      "http://localhost:8000",
      qs.stringify({
        name: "My Feed"
      })
    )
  ).data.match(/(\w{20}).xml/)![1];
}

function readFeed(token: string): string {
  return fs.readFileSync(feedPath(token), "utf8");
}
