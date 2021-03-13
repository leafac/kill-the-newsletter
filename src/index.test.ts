/*
You may send emails manually from the command line with the following:

cat << "EOF" > /tmp/example-email.txt
From: Publisher <publisher@example.com>
To: ru9rmeebswmcy7wx@localhost
Subject: A subject
Date: Sat, 13 Mar 2021 11:30:40

<p>Some HTML content</p>
EOF

curl smtp://localhost:2525 --mail-from publisher@example.com --mail-rcpt ru9rmeebswmcy7wx@localhost --upload-file /tmp/example-email.txt
*/

import { beforeAll, afterAll, describe, test, expect } from "@jest/globals";
import os from "os";
import path from "path";
import http from "http";
import net from "net";
import fs from "fs";
import * as got from "got";
import nodemailer from "nodemailer";
import html from "@leafac/html";
import killTheNewsletter from ".";

let webServer: http.Server;
let emailServer: net.Server;
let webClient: got.Got;
let emailClient: nodemailer.Transporter;
let emailHost: string;
beforeAll(() => {
  const rootDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "kill-the-newsletter--test--")
  );
  const { webApplication, emailApplication } = killTheNewsletter(rootDirectory);
  webServer = webApplication.listen(new URL(webApplication.get("url")).port);
  emailServer = emailApplication.listen(
    new URL(webApplication.get("email")).port
  );
  webClient = got.default.extend({ prefixUrl: webApplication.get("url") });
  emailClient = nodemailer.createTransport(webApplication.get("email"));
  emailHost = new URL(webApplication.get("url")).hostname;
});
afterAll(() => {
  webServer.close();
  emailServer.close();
});

test("Create feed", async () => {
  const createResponseBody = (
    await webClient.post("", { form: { name: "A newsletter" } })
  ).body;
  expect(createResponseBody).toMatch(`“A newsletter” inbox created`);
  const feedReference = createResponseBody.match(
    /\/feeds\/([a-z0-9]{16})\.xml/
  )![1];
  const feedResponse = await webClient.get(`feeds/${feedReference}.xml`);
  expect(feedResponse.headers["content-type"]).toMatch("application/atom+xml");
  expect(feedResponse.headers["x-robots-tag"]).toBe("noindex");
  expect(feedResponse.body).toMatch(html`<title>A newsletter</title>`);
  const alternateReference = feedResponse.body.match(
    /\/alternates\/([a-z0-9]{16})\.html/
  )![1];
  const alternateResponse = await webClient.get(
    `alternates/${alternateReference}.html`
  );
  expect(alternateResponse.headers["content-type"]).toMatch("text/html");
  expect(alternateResponse.headers["x-robots-tag"]).toBe("noindex");
  expect(alternateResponse.body).toMatch(`Enjoy your readings!`);
});

describe("Receive email", () => {
  test("HTML content", async () => {
    const feedReference = (
      await webClient.post("", { form: { name: "A newsletter" } })
    ).body.match(/\/feeds\/([a-z0-9]{16})\.xml/)![1];
    const feedBefore = (await webClient.get(`feeds/${feedReference}.xml`)).body;
    await emailClient.sendMail({
      from: "publisher@example.com",
      to: `${feedReference}@${emailHost}`,
      subject: "A subject",
      html: html`<p>Some HTML content</p>`,
    });
    const feed = (await webClient.get(`feeds/${feedReference}.xml`)).body;
    expect(feed.match(/<updated>(.+?)<\/updated>/)![1]).not.toBe(
      feedBefore.match(/<updated>(.+?)<\/updated>/)![1]
    );
    expect(feed).toMatch(
      html`<author><name>publisher@example.com</name></author>`
    );
    expect(feed).toMatch(html`<title>A subject</title>`);
    expect(feed).toMatch(
      html`<content type="html">${`<p>Some HTML content</p>`}</content>`
    );
  });
});

/*
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
*/
