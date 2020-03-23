import { webServer, emailServer } from ".";
import nodemailer from "nodemailer";
import axios from "axios";
import qs from "qs";

test("create feed", async () => {
  const identifier = await createFeed();

  expect(await getFeed(identifier)).toMatch("My Feed");
});

describe("receive email", () => {
  test("HTML content", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@kill-the-newsletter.com`,
      subject: "New Message",
      html: "<p>HTML content</p>"
    });
    const feed = await getFeed(identifier);
    expect(feed).toMatch("publisher@example.com");
    expect(feed).toMatch("New Message");
    expect(feed).toMatch("HTML content");
  });

  test("text content", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@kill-the-newsletter.com`,
      subject: "New Message",
      text: "TEXT content"
    });
    const feed = await getFeed(identifier);
    expect(feed).toMatch("TEXT content");
  });

  test("truncation", async () => {
    const identifier = await createFeed();
    for (const repetition of [...new Array(4).keys()])
      await emailClient.sendMail({
        from: "publisher@example.com",
        to: `${identifier}@kill-the-newsletter.com`,
        subject: "New Message",
        text: `REPETITION ${repetition} `.repeat(10_000)
      });
    const feed = await getFeed(identifier);
    expect(feed).toMatch("REPETITION 3");
    expect(feed).not.toMatch("REPETITION 0");
  });

  test("nonexistent address", async () => {
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: "nonexistent@kill-the-newsletter.com",
      subject: "New Message",
      html: "<p>HTML content</p>"
    });
  });
});

afterAll(() => {
  webServer.close();
  // FIXME: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/43268
  emailServer.close(() => {});
});

const webClient = axios.create({ baseURL: "http://localhost:8000" });
const emailClient = nodemailer.createTransport("smtp://localhost:2525");

async function createFeed(): Promise<string> {
  return (
    await webClient.post(
      "/",
      qs.stringify({
        name: "My Feed"
      })
    )
  ).data.match(/(\w{20}).xml/)![1];
}

async function getFeed(identifier: string): Promise<string> {
  return (await webClient.get(`/feeds/${identifier}.xml`)).data;
}
