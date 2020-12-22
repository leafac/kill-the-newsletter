import { webServer, emailServer, BASE_URL, EMAIL_DOMAIN, EMAIL_PORT } from ".";
import nodemailer from "nodemailer";
import axios from "axios";
import qs from "qs";
import { JSDOM } from "jsdom";

test("create feed", async () => {
  const identifier = await createFeed();
  const feed = await getFeed(identifier);
  const entry = feed.querySelector("feed > entry:first-of-type")!;
  const alternate = await getAlternate(
    entry.querySelector("link")!.getAttribute("href")!
  );
  expect(feed.querySelector("feed > title")!.textContent).toBe("My Feed");
  expect(entry.querySelector("title")!.textContent).toBe(
    "“My Feed” Inbox Created"
  );
  expect(alternate.querySelector("p")!.textContent).toMatch(
    "Sign up for the newsletter with"
  );
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
    expect(after.querySelector("feed > updated")!.textContent).not.toBe(
      before.querySelector("feed > updated")!.textContent
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
    const entry = feed.querySelector("feed > entry:first-of-type")!;
    const alternate = await getAlternate(
      entry.querySelector("link")!.getAttribute("href")!
    );
    expect(entry.querySelector("author > name")!.textContent).toBe(
      "publisher@example.com"
    );
    expect(entry.querySelector("title")!.textContent).toBe("New Message");
    expect(entry.querySelector("content")!.textContent).toMatch("HTML content");
    expect(alternate.querySelector("p")!.textContent).toMatch("HTML content");
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
    const entry = feed.querySelector("feed > entry:first-of-type")!;
    const alternate = await getAlternate(
      entry.querySelector("link")!.getAttribute("href")!
    );
    expect(entry.querySelector("content")!.textContent).toMatch("TEXT content");
    expect(alternate.querySelector("p")!.textContent).toMatch("TEXT content");
  });

  test("rich text content", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      text: "TEXT content\n\nhttps://leafac.com\n\nMore text",
    });
    const feed = await getFeed(identifier);
    const entry = feed.querySelector("feed > entry:first-of-type")!;
    const alternate = await getAlternate(
      entry.querySelector("link")!.getAttribute("href")!
    );
    expect(alternate.querySelector("a")!.getAttribute("href")).toBe(
      "https://leafac.com"
    );
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
    const entry = feed.querySelector("feed > entry:first-of-type")!;
    expect(entry.querySelector("content")!.textContent).toMatchInlineSnapshot(`
      "<p>Invalid XML character (backspace): ||💩</p>
      "
    `);
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
    const entry = feed.querySelector("feed > entry:first-of-type")!;
    expect(entry.querySelector("content")!.textContent).toMatchInlineSnapshot(
      `"<p>Invalid XML character (backspace): |&#x8;|&#x1F4A9;</p>"`
    );
  });

  test("missing ‘from’", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      html: "<p>HTML content</p>",
    });
    const feed = await getFeed(identifier);
    const entry = feed.querySelector("feed > entry:first-of-type")!;
    expect(entry.querySelector("author > name")!.textContent).toBe("");
    expect(entry.querySelector("title")!.textContent).toBe("New Message");
  });

  test("nonexistent ‘to’", async () => {
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `nonexistent@${EMAIL_DOMAIN}`,
      subject: "New Message",
      html: "<p>HTML content</p>",
    });
  });

  test("missing ‘subject’", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      html: "<p>HTML content</p>",
    });
    const feed = await getFeed(identifier);
    const entry = feed.querySelector("feed > entry:first-of-type")!;
    expect(entry.querySelector("title")!.textContent).toBe("");
    expect(entry.querySelector("author > name")!.textContent).toBe(
      "publisher@example.com"
    );
  });

  test("missing ‘content’", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
    });
    const feed = await getFeed(identifier);
    const entry = feed.querySelector("feed > entry:first-of-type")!;
    expect(entry.querySelector("content")!.textContent!.trim()).toBe("");
    expect(entry.querySelector("title")!.textContent).toBe("New Message");
  });

  test("truncation", async () => {
    const identifier = await createFeed();
    const alternatesURLs = new Array<string>();
    for (const repetition of [...new Array(4).keys()]) {
      await emailClient.sendMail({
        from: "publisher@example.com",
        to: `${identifier}@${EMAIL_DOMAIN}`,
        subject: "New Message",
        text: `REPETITION ${repetition} `.repeat(10_000),
      });
      const feed = await getFeed(identifier);
      const entry = feed.querySelector("feed > entry:first-of-type")!;
      alternatesURLs.push(entry.querySelector("link")!.getAttribute("href")!);
    }
    const feed = await getFeed(identifier);
    expect(
      feed.querySelector("entry:first-of-type > content")!.textContent
    ).toMatch("REPETITION 3");
    expect(
      feed.querySelector("entry:last-of-type > content")!.textContent
    ).toMatch("REPETITION 1");
    expect((await getAlternate(alternatesURLs[3]!)).textContent).toMatch(
      "REPETITION 3"
    );
    await expect(getAlternate(alternatesURLs[0]!)).rejects.toThrowError();
  });

  test("too big entry", async () => {
    const identifier = await createFeed();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      text: "TOO BIG".repeat(100_000),
    });
    expect((await getFeed(identifier)).querySelector("entry")).toBeNull();
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${identifier}@${EMAIL_DOMAIN}`,
      subject: "New Message",
      text: `NORMAL SIZE`,
    });
    expect(
      (await getFeed(identifier)).querySelector("entry > content")!.textContent
    ).toMatchInlineSnapshot(`"<p>NORMAL SIZE</p>"`);
  });
});

test("‘noindex’ header", async () => {
  const identifier = await createFeed();
  const feed = await getFeed(identifier);
  const entry = feed.querySelector("feed > entry:first-of-type")!;
  const alternatePath = entry.querySelector("link")!.getAttribute("href")!;
  expect((await webClient.get(`/`)).headers["x-robots-tag"]).toBeUndefined();
  expect(
    (await webClient.get(`/feeds/${identifier}.xml`)).headers["x-robots-tag"]
  ).toBe("noindex");
  expect((await webClient.get(alternatePath)).headers["x-robots-tag"]).toBe(
    "noindex"
  );
});

const webClient = axios.create({
  baseURL: BASE_URL,
});
const emailClient = nodemailer.createTransport(
  `smtp://${EMAIL_DOMAIN}:${EMAIL_PORT}`
);
afterAll(() => {
  webServer.close();
  emailServer.close();
});

async function createFeed(): Promise<string> {
  return JSDOM.fragment(
    (
      await webClient.post(
        "/",
        qs.stringify({
          name: "My Feed",
        })
      )
    ).data
  )
    .querySelector("code")!
    .textContent!.split("@")[0];
}

async function getFeed(identifier: string): Promise<Document> {
  return new JSDOM((await webClient.get(`/feeds/${identifier}.xml`)).data, {
    contentType: "text/xml",
  }).window.document;
}

async function getAlternate(url: string): Promise<DocumentFragment> {
  return JSDOM.fragment((await webClient.get(url)).data);
}
