/*
You may send emails manually from the command line with the following:

cat << "EOF" > /tmp/example-email.txt
From: Publisher <publisher@example.com>
To: ru9rmeebswmcy7wx@localhost
Subject: Test email with HTML
Date: Sat, 13 Mar 2021 11:30:40

<p>Some HTML</p>
EOF

curl smtp://localhost:2525 --mail-from publisher@example.com --mail-rcpt ru9rmeebswmcy7wx@localhost --upload-file /tmp/example-email.txt
*/

import { test, expect } from "@jest/globals";
import os from "os";
import path from "path";
import fs from "fs";
import * as got from "got";
import nodemailer from "nodemailer";
import html from "@leafac/html";
import killTheNewsletter from ".";

test("Kill the Newsletter!", async () => {
  // Start servers
  const rootDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "kill-the-newsletter--test--")
  );
  const { webApplication, emailApplication } = killTheNewsletter(rootDirectory);
  const webServer = webApplication.listen(
    new URL(webApplication.get("url")).port
  );
  const emailServer = emailApplication.listen(
    new URL(webApplication.get("email")).port
  );
  const webClient = got.default.extend({
    prefixUrl: webApplication.get("url"),
  });
  const emailClient = nodemailer.createTransport(webApplication.get("email"));
  const emailHost = new URL(webApplication.get("url")).hostname;

  // Create feed
  const create = (await webClient.post("", { form: { name: "A newsletter" } }))
    .body;
  expect(create).toMatch(`“A newsletter” inbox created`);
  const feedReference = create.match(/\/feeds\/([a-z0-9]{16})\.xml/)![1];

  // Test feed properties
  const feedOriginal = await webClient.get(`feeds/${feedReference}.xml`);
  expect(feedOriginal.headers["content-type"]).toMatch("application/atom+xml");
  expect(feedOriginal.headers["x-robots-tag"]).toBe("noindex");
  expect(feedOriginal.body).toMatch(html`<title>A newsletter</title>`);

  // Test alternate
  const alternateReference = feedOriginal.body.match(
    /\/alternates\/([a-z0-9]{16})\.html/
  )![1];
  const alternate = await webClient.get(
    `alternates/${alternateReference}.html`
  );
  expect(alternate.headers["content-type"]).toMatch("text/html");
  expect(alternate.headers["x-robots-tag"]).toBe("noindex");
  expect(alternate.body).toMatch(`Enjoy your readings!`);

  // Test email with HTML
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for a second to test that the ‘<updated>’ field will be updated
  await emailClient.sendMail({
    from: "publisher@example.com",
    to: `${feedReference}@${emailHost}`,
    subject: "Test email with HTML",
    html: html`<p>Some HTML</p>`,
  });
  const feed = (await webClient.get(`feeds/${feedReference}.xml`)).body;
  expect(feed.match(/<updated>(.+?)<\/updated>/)![1]).not.toBe(
    feedOriginal.body.match(/<updated>(.+?)<\/updated>/)![1]
  );
  expect(feed).toMatch(
    html`<author><name>publisher@example.com</name></author>`
  );
  expect(feed).toMatch(html`<title>Test email with HTML</title>`);
  expect(feed).toMatch(
    // prettier-ignore
    html`<content type="html">${`<p>Some HTML</p>`}\n</content>`
  );

  // Test email with text
  await emailClient.sendMail({
    from: "publisher@example.com",
    to: `${feedReference}@${emailHost}`,
    subject: "Test email with text",
    text: "A link: https://kill-the-newsletter.com",
  });
  expect((await webClient.get(`feeds/${feedReference}.xml`)).body).toMatch(
    // prettier-ignore
    html`<content type="html">${`<p>A link: <a href="https://kill-the-newsletter.com">https://kill-the-newsletter.com</a></p>`}</content>`
  );

  // Test email missing ‘from’
  await emailClient.sendMail({
    to: `${feedReference}@${emailHost}`,
    subject: "Test email missing ‘from’",
    text: "A link: https://kill-the-newsletter.com",
  });
  expect((await webClient.get(`feeds/${feedReference}.xml`)).body).toMatch(
    html`<author><name></name></author>`
  );

  // Test email to nonexistent ‘to’ (gets ignored)
  await emailClient.sendMail({
    from: "publisher@example.com",
    to: `nonexistent@${emailHost}`,
    subject: "Test email to nonexistent ‘to’ (gets ignored)",
    text: "A link: https://kill-the-newsletter.com",
  });
  expect((await webClient.get(`feeds/${feedReference}.xml`)).body).not.toMatch(
    "Test email to nonexistent ‘to’ (gets ignored)"
  );

  // Test email missing ‘subject’
  await emailClient.sendMail({
    from: "publisher@example.com",
    to: `${feedReference}@${emailHost}`,
    text: "A link: https://kill-the-newsletter.com",
  });
  expect((await webClient.get(`feeds/${feedReference}.xml`)).body).toMatch(
    html`<title></title>`
  );

  // Test email missing content
  await emailClient.sendMail({
    from: "publisher@example.com",
    to: `${feedReference}@${emailHost}`,
    subject: "Test email missing content",
  });
  expect((await webClient.get(`feeds/${feedReference}.xml`)).body).toMatch(
    html`<content type="html"></content>`
  );

  // Stop servers
  webServer.close();
  emailServer.close();
});

/*
describe("receive email", () => {
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
