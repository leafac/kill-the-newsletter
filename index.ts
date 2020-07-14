import express from "express";
import { SMTPServer } from "smtp-server";
import mailparser from "mailparser";
import { promises as fs } from "fs";
import * as entities from "entities";
import { JSDOM } from "jsdom";
import * as sanitizeXMLString from "sanitize-xml-string";
import writeFileAtomic from "write-file-atomic";
import cryptoRandomString from "crypto-random-string";

export const WEB_PORT = process.env.WEB_PORT ?? 8000;
export const EMAIL_PORT = process.env.EMAIL_PORT ?? 2525;
export const BASE_URL = process.env.BASE_URL ?? "http://localhost:8000";
export const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN ?? "localhost";
export const ISSUE_REPORT =
  process.env.ISSUE_REPORT ?? "mailto:kill-the-newsletter@leafac.com";

export const webServer = express()
  .use(express.static("static"))
  .use(express.urlencoded({ extended: true }))
  .get("/", (req, res) =>
    res.send(
      layout(`
        <form method="POST" action="/">
          <p>
            <input type="text" name="name" placeholder="Newsletter Name…" maxlength="500" size="30" required>
            <button>Create Inbox</button>
          </p>
        </form>
      `)
    )
  )
  .post("/", async (req, res, next) => {
    try {
      const { name } = req.body;
      const identifier = createIdentifier();
      await writeFileAtomic(alternatePath(identifier), created(identifier));
      await writeFileAtomic(feedPath(identifier), feed(X(name), identifier));
      res.send(
        layout(`
          <p><strong>“${H(name)}” Inbox Created</strong></p>
          ${created(identifier)}
        `)
      );
    } catch (error) {
      console.error(error);
      next(error);
    }
  })
  .get("/alternate", (req, res) =>
    res.send(
      layout(`
        <p>Typically each entry in a feed includes a link<br>to an online version of the same content,<br>but the content from the entries in a <strong>Kill the Newsletter!</strong><br>feed come from emails—an online version may not even exist—<br>so you’re reading this instead.</p>
        <p><a href="${BASE_URL}"><strong>Create an Inbox</strong></a></p>
    `)
    )
  )
  .listen(WEB_PORT);

export const emailServer = new SMTPServer({
  disabledCommands: ["AUTH", "STARTTLS"],
  async onData(stream, session, callback) {
    try {
      const email = await mailparser.simpleParser(stream);
      const identifier = createIdentifier();
      const content =
        typeof email.html === "string" ? email.html : email.textAsHtml ?? "";
      await writeFileAtomic(alternatePath(identifier), content);
      const newEntry = entry(
        X(email.subject ?? ""),
        X(email.from?.text ?? ""),
        X(content),
        identifier
      );
      for (const { address } of session.envelope.rcptTo) {
        const match = address.match(
          new RegExp(`^(?<identifier>\\w+)@${EMAIL_DOMAIN}$`)
        );
        if (match?.groups === undefined) continue;
        const path = feedPath(match.groups.identifier);
        const xmlText = await fs.readFile(path, "utf8").catch(() => null);
        if (xmlText === null) continue;
        const xml = new JSDOM(xmlText, { contentType: "text/xml" });
        const document = xml.window.document;
        const updated = document.querySelector("feed > updated");
        if (updated === null)
          throw new Error(`Can’t find ‘updated’ field in feed at ‘${path}’.`);
        updated.textContent = now();
        const firstEntry = document.querySelector("feed > entry:first-of-type");
        if (firstEntry !== null)
          firstEntry.insertAdjacentHTML("beforebegin", newEntry);
        else
          document
            .querySelector("feed")!
            .insertAdjacentHTML("beforeend", newEntry);
        while (
          document.querySelector("feed > entry") !== null &&
          xml.serialize().length > 500_000
        )
          document.querySelector("feed > entry:last-of-type")!.remove();
        await writeFileAtomic(
          path,
          `<?xml version="1.0" encoding="utf-8"?>${xml.serialize()}`
        );
      }
      callback();
    } catch (error) {
      console.error(
        `Error receiving email: ${JSON.stringify(session, null, 2)}`
      );
      console.error(error);
      stream.resume();
      callback(new Error("Failed to receive message. Please try again."));
    }
  },
}).listen(EMAIL_PORT);

function layout(content: string): string {
  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kill the Newsletter!</title>
        <meta name="author" content="Leandro Facchinetti">
        <meta name="description" content="Convert email newsletters into Atom feeds.">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        <link rel="stylesheet" type="text/css" href="/styles.css">
      </head>
      <body>
        <header>
          <h1><a href="/">Kill the Newsletter!</a></h1>
          <p>Convert email newsletters into Atom feeds</p>
          <p><img alt="Convert email newsletters into Atom feeds" src="/logo.svg"></p>
        </header>
        <main>${content}</main>
        <footer><p>By <a href="https://www.leafac.com">Leandro Facchinetti</a> · <a href="https://github.com/leafac/www.kill-the-newsletter.com">Source</a> · <a href="${ISSUE_REPORT}">Report an Issue</a></p></footer>
      </body>
    </html>
  `;
}

function created(identifier: string): string {
  return `
    <p>Sign up for the newsletter with<br><code>${feedEmail(
      identifier
    )}</code></p>
    <p>Subscribe to the Atom feed at<br><code>${feedURL(identifier)}</code></p>
    <p>Don’t share these addresses.<br>They contain an identifier that other people could use<br>to send you spam and to control your newsletter subscriptions.</p>
    <p>Enjoy your readings!</p>
    <p><a href="${BASE_URL}"><strong>Create Another Inbox</strong></a></p>
  `.trim();
}

function feed(name: string, identifier: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <link rel="self" type="application/atom+xml" href="${feedURL(
        identifier
      )}"/>
      <link rel="alternate" type="text/html" href="${alternateURL(
        identifier
      )}"/>
      <id>${urn(identifier)}</id>
      <title>${name}</title>
      <subtitle>Kill the Newsletter! Inbox: ${feedEmail(
        identifier
      )} → ${feedURL(identifier)}</subtitle>
      <updated>${now()}</updated>
      <author><name>Kill the Newsletter!</name></author>
      ${entry(
        `“${name}” Inbox Created`,
        "Kill the Newsletter!",
        X(created(identifier)),
        identifier
      )}
    </feed>
  `;
}

function entry(
  title: string,
  author: string,
  content: string,
  identifier: string
): string {
  return `
    <entry>
      <id>${urn(identifier)}</id>
      <title>${title}</title>
      <author><name>${author}</name></author>
      <updated>${now()}</updated>
      <link rel="alternate" type="text/html" href="${alternateURL(
        identifier
      )}"/>
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
  return `urn:kill-the-newsletter:${identifier}`;
}

function X(string: string): string {
  return entities.encodeXML(sanitizeXMLString.sanitize(string));
}

function H(string: string): string {
  return entities.encodeHTML(sanitizeXMLString.sanitize(string));
}
