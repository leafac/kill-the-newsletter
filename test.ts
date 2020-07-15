import { webServer, emailServer, WEB_PORT, EMAIL_PORT, EMAIL_DOMAIN } from ".";
import nodemailer from "nodemailer";
import axios from "axios";
import qs from "qs";
import { JSDOM } from "jsdom";

test("create feed", async () => {
  const identifier = await createFeed();
  expect(await getFeed(identifier)).toMatch("My Feed");
});

describe("receive email", () => {
  test("‘updated’ field is updated", async () => {
    const identifier = await createFeed();
    const before = await getFeed(identifier);
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      html: "<p>HTML content</p>",
    });
    const after = await getFeed(identifier);
    expect(after.match(/<updated>(.*)<\/updated>/)![1]).not.toMatch(
      before.match(/<updated>(.*)<\/updated>/)![1]
    );
  });

  test("HTML content", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      html: "<p>HTML content</p>",
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
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      text: "TEXT content",
    });
    const feed = await getFeed(identifier);
    expect(feed).toMatch("TEXT content");
  });

  test("rich text content", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      text: "TEXT content\n\nhttps://www.leafac.com\n\nMore text",
    });
    const feed = await getFeed(identifier);
    expect(feed).toMatch("TEXT content");
    expect(feed).toMatch(`href="https://www.leafac.com"`);
  });

  test("invalid XML character in HTML", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      html: "<p>Invalid XML character (backspace): |\b|💩</p>",
    });
    const feed = await getFeed(identifier);
    expect(feed).toMatch("Invalid XML character (backspace): ||💩");
  });

  test("invalid XML character in text", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      text: "Invalid XML character (backspace): |\b|💩",
    });
    const feed = await getFeed(identifier);
    expect(feed).toMatch(
      "Invalid XML character (backspace): |&amp;#x8;|&amp;#x1F4A9;"
    );
  });

  test("missing content", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
    });
    const feed = await getFeed(identifier);
    expect(feed).toMatch("New Message");
  });

  test("missing subject", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      html: "<p>HTML content</p>",
    });
    const feed = await getFeed(identifier);
    expect(feed).toMatch("HTML content");
  });

  test("truncation", async () => {
    const identifier = await createFeed();
    for (const repetition of [...new Array(4).keys()])
      await emailClient.sendMail({
        from: "publisher@example.com",
        to: `${identifier}@${EMAIL_DOMAIN}`,
        subject: "New Message",
        text: `REPETITION ${repetition} `.repeat(10_000),
      });
    const feed = await getFeed(identifier);
    expect(feed).toMatch("REPETITION 3");
    expect(feed).not.toMatch("REPETITION 0");
  });

  test("too big entry", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      text: `TOO BIG`.repeat(100_000),
    });
    expect(await getFeed(identifier)).not.toMatch("<entry>");
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      text: `NORMAL SIZE`,
    });
    const feed = await getFeed(identifier);
    expect(feed).toMatch("<entry>");
    expect(feed).toMatch("NORMAL SIZE");
  });

  test("nonexistent address", async () => {
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `nonexistent@${EMAIL_DOMAIN}`,
      subject: "New Message",
      html: "<p>HTML content</p>",
    });
  });

  test("missing from", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      html: "<p>HTML content</p>",
    });
    const feed = await getFeed(identifier);
    expect(feed).toMatch("HTML content");
  });
});

describe("alternate", () => {
  test("HTML content", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      html: "<p>HTML content</p>",
    });
    const feed = await getFeed(identifier);
    const xml = new JSDOM(feed, { contentType: "text/xml" });
    const document = xml.window.document;
    const href = document
      .querySelector("feed > entry link")!
      .getAttribute("href") as string;
    const alternate = await getAlternate(href);
    expect(feed).toMatch("publisher@example.com");
    expect(feed).toMatch("New Message");
    expect(feed).toMatch("HTML content");
  });
});

afterAll(() => {
  webServer.close();
  emailServer.close();
});

const webClient = axios.create({
  baseURL: `http://localhost:${WEB_PORT}`,
});
const emailClient = nodemailer.createTransport(
  `smtp://localhost:${EMAIL_PORT}`
);

async function createFeed(): Promise<string> {
  return (
    await webClient.post(
      "/",
      qs.stringify({
        name: "My Feed",
      })
    )
  ).data.match(/(\w{20}).xml/)![1];
}

async function getFeed(identifier: string): Promise<string> {
  return (await webClient.get(`/feeds/${identifier}.xml`)).data;
}

async function getAlternate(url: string): Promise<string> {
  return (await webClient.get(url)).data;
}
