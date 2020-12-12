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
      const renderedCreated = created(identifier);
      await writeFileAtomic(
        feedFilePath(identifier),
        feed(
          identifier,
          X(name),
          entry(
            identifier,
            createIdentifier(),
            `“${X(name)}” Inbox Created`,
            "Kill the Newsletter!",
            X(renderedCreated)
          )
        )
      );
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
  .get(
    alternatePath(":feedIdentifier", ":entryIdentifier"),
    async (req, res, next) => {
      try {
        const { feedIdentifier, entryIdentifier } = req.params;
        const path = feedFilePath(feedIdentifier);
        let text;
        try {
          text = await fs.readFile(path, "utf8");
        } catch {
          return res.sendStatus(404);
        }
        const feed = new JSDOM(text, { contentType: "text/xml" });
        const document = feed.window.document;
        const link = document.querySelector(
          `link[href="${alternateURL(feedIdentifier, entryIdentifier)}"]`
        );
        if (link === null) return res.sendStatus(404);
        res.send(
          entities.decodeXML(
            link.parentElement!.querySelector("content")!.textContent!
          )
        );
      } catch (error) {
        console.error(error);
        next(error);
      }
    }
  )
  .listen(WEB_PORT);

export const emailServer = new SMTPServer({
  disabledCommands: ["AUTH", "STARTTLS"],
  async onData(stream, session, callback) {
    try {
      const email = await mailparser.simpleParser(stream);
      const content =
        typeof email.html === "string" ? email.html : email.textAsHtml ?? "";
      for (const address of new Set(
        session.envelope.rcptTo.map(({ address }) => address)
      )) {
        const match = address.match(
          new RegExp(`^(?<identifier>\\w+)@${R(EMAIL_DOMAIN)}$`)
        );
        if (match?.groups === undefined) continue;
        const identifier = match.groups.identifier.toLowerCase();
        const path = feedFilePath(identifier);
        let text;
        try {
          text = await fs.readFile(path, "utf8");
        } catch {
          continue;
        }
        const feed = new JSDOM(text, { contentType: "text/xml" });
        const document = feed.window.document;
        const updated = document.querySelector("feed > updated");
        if (updated === null) {
          console.error(`Field ‘updated’ not found: ‘${path}’`);
          continue;
        }
        updated.textContent = now();
        const renderedEntry = entry(
          identifier,
          createIdentifier(),
          X(email.subject ?? ""),
          X(email.from?.text ?? ""),
          X(content)
        );
        const firstEntry = document.querySelector("feed > entry:first-of-type");
        if (firstEntry === null)
          document
            .querySelector("feed")!
            .insertAdjacentHTML("beforeend", renderedEntry);
        else firstEntry.insertAdjacentHTML("beforebegin", renderedEntry);
        while (feed.serialize().length > 500_000) {
          const lastEntry = document.querySelector("feed > entry:last-of-type");
          if (lastEntry === null) break;
          lastEntry.remove();
        }
        await writeFileAtomic(
          path,
          html`<?xml version="1.0" encoding="utf-8"?>${feed.serialize()}`.trim()
        );
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
        <script src="/clipboard.min.js"></script>
        <script src="/scripts.js"></script>
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
      Sign up for the newsletter with<br /><code class="copyable"
        >${feedEmail(identifier)}</code
      >
    </p>
    <p>
      Subscribe to the Atom feed at<br /><code class="copyable"
        >${feedURL(identifier)}</code
      >
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

function feed(identifier: string, name: string, initialEntry: string): string {
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
      <subtitle
        >Kill the Newsletter! Inbox: ${feedEmail(identifier)} →
        ${feedURL(identifier)}</subtitle
      >
      <updated>${now()}</updated>
      <author><name>Kill the Newsletter!</name></author>
      ${initialEntry}
    </feed>
  `.trim();
}

function entry(
  feedIdentifier: string,
  entryIdentifier: string,
  title: string,
  author: string,
  content: string
): string {
  return html`
    <entry>
      <id>${urn(entryIdentifier)}</id>
      <title>${title}</title>
      <author><name>${author}</name></author>
      <updated>${now()}</updated>
      <link
        rel="alternate"
        type="text/html"
        href="${alternateURL(feedIdentifier, entryIdentifier)}"
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

function now(): string {
  return new Date().toISOString();
}

function feedFilePath(identifier: string): string {
  return `static/feeds/${identifier}.xml`;
}

function feedURL(identifier: string): string {
  return `${BASE_URL}/feeds/${identifier}.xml`;
}

function feedEmail(identifier: string): string {
  return `${identifier}@${EMAIL_DOMAIN}`;
}

function alternatePath(
  feedIdentifier: string,
  entryIdentifier: string
): string {
  return `/alternate/${feedIdentifier}/${entryIdentifier}.html`;
}

function alternateURL(feedIdentifier: string, entryIdentifier: string): string {
  return `${BASE_URL}${alternatePath(feedIdentifier, entryIdentifier)}`;
}

function urn(identifier: string): string {
  return `urn:kill-the-newsletter:${identifier}`;
}

function X(string: string): string {
  return entities.encodeXML(sanitizeXMLString.sanitize(string));
}

function H(string: string): string {
  return entities.encodeHTML(sanitizeXMLString.sanitize(string));
}
