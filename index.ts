import express from "express";
import { SMTPServer } from "smtp-server";
import mailparser from "mailparser";
import * as sanitizeXMLString from "sanitize-xml-string";
import * as entities from "entities";
import R from "escape-string-regexp";
import { JSDOM } from "jsdom";
import { promises as fs } from "fs";
import writeFileAtomic from "write-file-atomic";
import cryptoRandomString from "crypto-random-string";
import html from "tagged-template-noop";

export const WEB_PORT = process.env.WEB_PORT ?? 8000;
export const EMAIL_PORT = process.env.EMAIL_PORT ?? 2525;
export const BASE_URL = process.env.BASE_URL ?? "http://localhost:8000";
export const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN ?? "localhost";
export const ISSUE_REPORT =
  process.env.ISSUE_REPORT ?? "mailto:kill-the-newsletter@leafac.com";

export const webServer = express()
  .use(express.static("static"))
  .use(express.urlencoded({ extended: true }))
  .get("/", (req, res) => res.send(layout(newInbox())))
  .post("/", async (req, res, next) => {
    try {
      const { name } = req.body;
      const identifier = createIdentifier();
      await writeFileAtomic(feedPath(identifier), feed(identifier, X(name)));
      const renderedCreated = created(identifier);
      // await addEntryToFeed(
      //   identifier,
      //   entry(
      //     createIdentifier(),
      //     `“${X(name)}” Inbox Created`,
      //     "Kill the Newsletter!",
      //     X(renderedCreated)
      //   )
      // );
      res.send(
        layout(html`
          <p><strong>“${H(name)}” Inbox Created</strong></p>
          ${renderedCreated}
        `)
      );
    } catch (error) {
      console.error(error);
      next(error);
    }
  })
  .listen(WEB_PORT);

export const emailServer = new SMTPServer({
  disabledCommands: ["AUTH", "STARTTLS"],
  async onData(stream, session, callback) {
    try {
      const email = await mailparser.simpleParser(stream);
      const content =
        typeof email.html === "string" ? email.html : email.textAsHtml ?? "";
      for (const { address } of session.envelope.rcptTo) {
        const match = address.match(
          new RegExp(`^(?<identifier>\\w+)@${R(EMAIL_DOMAIN)}$`)
        );
        if (match?.groups === undefined) continue;
        const identifier = match.groups.identifier.toLowerCase();
        await addEntryToFeed(
          identifier,
          entry(
            createIdentifier(),
            X(email.subject ?? ""),
            X(email.from?.text ?? ""),
            X(content)
          )
        ).catch((error) => {
          console.error(error);
        });
      }
      callback();
    } catch (error) {
      console.error(
        `Failed to receive message: ‘${JSON.stringify(session, null, 2)}’`
      );
      console.error(error);
      stream.resume();
      callback(new Error("Failed to receive message. Please try again."));
    }
  },
}).listen(EMAIL_PORT);

async function addEntryToFeed(
  identifier: string,
  entry: string
): Promise<void> {
  const path = feedPath(identifier);
  let text;
  try {
    text = await fs.readFile(path, "utf8");
  } catch {
    return;
  }
  const feed = new JSDOM(text, { contentType: "text/xml" });
  const document = feed.window.document;
  const updated = document.querySelector("feed > updated");
  if (updated === null) throw new Error(`Field ‘updated’ not found: ‘${path}’`);
  updated.textContent = now();
  const firstEntry = document.querySelector("feed > entry:first-of-type");
  if (firstEntry === null)
    document.querySelector("feed")!.insertAdjacentHTML("beforeend", entry);
  else firstEntry.insertAdjacentHTML("beforebegin", entry);
  const entryDocument = JSDOM.fragment(entry);
  await writeFileAtomic(
    alternatePath(getEntryIdentifier(entryDocument)),
    entities.decodeXML(entryDocument.querySelector("content")!.textContent!)
  );
  while (feed.serialize().length > 500_000) {
    const entry = document.querySelector("feed > entry:last-of-type");
    if (entry === null) break;
    entry.remove();
    const path = alternatePath(getEntryIdentifier(entry));
    await fs.unlink(path).catch(() => {
      console.error(`File not found: ‘${path}’`);
    });
  }
  await writeFileAtomic(
    path,
    html`<?xml version="1.0" encoding="utf-8"?>${feed.serialize()}`.trim()
  );
}

function layout(content: string): string {
  return html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Kill the Newsletter!</title>
        <meta name="author" content="Leandro Facchinetti" />
        <meta
          name="description"
          content="Convert email newsletters into Atom feeds."
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="stylesheet" type="text/css" href="/styles.css" />
      </head>
      <body>
        <header>
          <h1><a href="/">Kill the Newsletter!</a></h1>
          <p>Convert email newsletters into Atom feeds</p>
          <p>
            <img
              src="/logo.svg"
              alt="Convert email newsletters into Atom feeds"
            />
          </p>
        </header>
        <main>${content}</main>
        <footer>
          <p>
            By <a href="https://leafac.com">Leandro Facchinetti</a> ·
            <a href="https://github.com/leafac/kill-the-newsletter.com"
              >Source</a
            >
            · <a href="${ISSUE_REPORT}">Report an Issue</a>
          </p>
        </footer>
      </body>
    </html>
  `.trim();
}

function newInbox(): string {
  return html`
    <form method="POST" action="/">
      <p>
        <input
          type="text"
          name="name"
          placeholder="Newsletter Name…"
          maxlength="500"
          size="30"
          required
        />
        <button>Create Inbox</button>
      </p>
    </form>
  `;
}

function created(identifier: string): string {
  return html`
    <p>
      Sign up for the newsletter with<br /><code>${feedEmail(identifier)}</code>
    </p>
    <p>
      Subscribe to the Atom feed at<br /><code>${feedURL(identifier)}</code>
    </p>
    <p>
      Don’t share these addresses.<br />They contain an identifier that other
      people could use<br />to send you spam and to control your newsletter
      subscriptions.
    </p>
    <p>Enjoy your readings!</p>
    <p>
      <a href="${BASE_URL}"><strong>Create Another Inbox</strong></a>
    </p>
  `.trim();
}

function feed(identifier: string, name: string): string {
  return html`
    <?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <link
        rel="self"
        type="application/atom+xml"
        href="${feedURL(identifier)}"
      />
      <link rel="alternate" type="text/html" href="${BASE_URL}" />
      <id>${urn(identifier)}</id>
      <title>${name}</title>
      <subtitle>Welcome to your Reachme RSS feed!</subtitle>
      <updated>${now()}</updated>
      <author><name>reachme.fyi</name></author>
    </feed>
  `.trim();
}

function entry(
  identifier: string,
  title: string,
  author: string,
  content: string
): string {
  return html`
    <entry>
      <id>${urn(identifier)}</id>
      <title>${title}</title>
      <author><name>${author}</name></author>
      <updated>${now()}</updated>
      <link
        rel="alternate"
        type="text/html"
        href="${alternateURL(identifier)}"
      />
      <content type="html">${content}</content>
    </entry>
  `.trim();
}

function createIdentifier(): string {
  return cryptoRandomString({
    length: 20,
    characters: "1234567890qwertyuiopasdfghjklzxcvbnm",
  });
}

function getEntryIdentifier(entry: ParentNode): string {
  return entry.querySelector("id")!.textContent!.split(":")[2];
}

function now(): string {
  return new Date().toISOString();
}

function feedPath(identifier: string): string {
  return `static/feeds/${identifier}.xml`;
}

function feedURL(identifier: string): string {
  return `${BASE_URL}/feeds/${identifier}.xml`;
}

function feedEmail(identifier: string): string {
  return `${identifier}@${EMAIL_DOMAIN}`;
}

function alternatePath(identifier: string): string {
  return `static/alternate/${identifier}.html`;
}

function alternateURL(identifier: string): string {
  return `${BASE_URL}/alternate/${identifier}.html`;
}

function urn(identifier: string): string {
  return `urn:reachmefyi:${identifier}`;
}

function X(string: string): string {
  return entities.encodeXML(sanitizeXMLString.sanitize(string));
}

function H(string: string): string {
  return entities.encodeHTML(sanitizeXMLString.sanitize(string));
}
