import express from "express";
import { SMTPServer } from "smtp-server";
import mailparser from "mailparser";
import React from "react";
import ReactDOMServer from "react-dom/server";
import * as xmlbuilder2 from "xmlbuilder2";
import { promises as fs } from "fs";
import writeFileAtomic from "write-file-atomic";
import cryptoRandomString from "crypto-random-string";

export const webServer = express()
  .use(express.static("static"))
  .use(express.urlencoded({ extended: true }))
  .get("/", (req, res) =>
    res.send(
      renderHTML(
        <Layout>
          <Form></Form>
        </Layout>
      )
    )
  )
  .post("/", (req, res, next) => {
    let name: string;
    let identifier: string;
    (async () => {
      name = req.body.name;
      identifier = createIdentifier();
      await fs.writeFile(
        feedPath(identifier),
        renderXML(Feed({ name, identifier }))
      );
      res.send(
        renderHTML(
          <Layout>
            <h1>“{name}” Inbox Created</h1>
            <Created identifier={identifier}></Created>
          </Layout>
        )
      );
    })().catch(error => {
      console.error(
        `Error creating feed: ${JSON.stringify({ name, identifier }, null, 2)}`
      );
      console.error(error);
      next(error);
    });
  })
  .get("/entry", (req, res) =>
    res.send(
      renderHTML(
        <Layout>
          <p>
            Typically each entry on a feed includes a link
            <br />
            to an online version of the same content,
            <br />
            but the content from the entries on a{" "}
            <strong>Kill the Newsletter!</strong>
            <br /> feed come from emails—an online version may not even exist—
            <br />
            so you’re reading this instead.
          </p>

          <p>
            <a href="https://www.kill-the-newsletter.com">
              <strong>Create an Inbox</strong>
            </a>
          </p>
        </Layout>
      )
    )
  )
  .listen(process.env.WEB_PORT ?? 8000);

export const emailServer = new SMTPServer({
  disabledCommands: ["AUTH", "STARTTLS"],
  onData(stream, session, callback) {
    let email: mailparser.ParsedMail;
    (async () => {
      email = await mailparser.simpleParser(stream);
      const { entry } = Entry({
        title: email.subject ?? "",
        author: email.from?.text ?? "",
        content:
          typeof email.html === "string" ? email.html : email.textAsHtml ?? ""
      });
      for (const { address } of session.envelope.rcptTo) {
        const match = address.match(/^(\w+)@kill-the-newsletter.com$/);
        if (match === null) continue;
        const identifier = match[1];
        const path = feedPath(identifier);
        const xmlText = await fs.readFile(path, "utf8").catch(() => null);
        if (xmlText === null) continue;
        const xml = parseXML(xmlText);
        xml.feed.updated = now();
        if (xml.feed.entry === undefined) xml.feed.entry = [];
        if (!Array.isArray(xml.feed.entry)) xml.feed.entry = [xml.feed.entry];
        xml.feed.entry.unshift(entry);
        while (xml.feed.entry.length > 0 && renderXML(xml).length > 500_000)
          xml.feed.entry.pop();
        await writeFileAtomic(path, renderXML(xml));
      }
      callback();
    })().catch(error => {
      console.error(
        `Error receiving email: ${JSON.stringify({ session, email }, null, 2)}`
      );
      console.error(error);
      stream.resume();
      callback(new Error("Failed to receive message. Please try again."));
    });
  }
}).listen(process.env.EMAIL_PORT ?? 2525);

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="author" content="Leandro Facchinetti" />
        <meta
          name="description"
          content="Convert email newsletters into Atom feeds."
        />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-32x32.png"
          sizes="32x32"
        />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-16x16.png"
          sizes="16x16"
        />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="stylesheet" type="text/css" href="/styles.css" />
        <title>Kill the Newsletter!</title>
      </head>
      <body style={{ textAlign: "center" }}>
        <header>
          <h1>
            <a href="/">Kill the Newsletter!</a>
          </h1>
          <p>Convert email newsletters into Atom feeds</p>
          <p>
            <img
              alt="Convert email newsletters into Atom feeds"
              src="/logo.png"
              width="150"
            />
          </p>
        </header>
        <main>{children}</main>
        <footer>
          <p>
            By <a href="https://www.leafac.com">Leandro Facchinetti</a> ·{" "}
            <a href="https://github.com/leafac/www.kill-the-newsletter.com">
              Source
            </a>{" "}
            ·{" "}
            <a href="mailto:kill-the-newsletter@leafac.com">Report an Issue</a>
          </p>
        </footer>
      </body>
    </html>
  );
}

function Form() {
  return (
    <form method="POST" action="/">
      <p>
        <input
          type="text"
          name="name"
          placeholder="Newsletter Name…"
          maxLength={500}
          size={30}
          required
        />
        <button>Create Inbox</button>
      </p>
    </form>
  );
}

function Created({ identifier }: { identifier: string }) {
  return (
    <>
      <p>
        Sign up for the newsletter with
        <br />
        <code>{feedEmail(identifier)}</code>
      </p>
      <p>
        Subscribe to the Atom feed at
        <br />
        <code>{feedURL(identifier)}</code>
      </p>
      <p>
        Don’t share these addresses.
        <br />
        They contain an identifier that other people could use
        <br />
        to send you spam and to control your newsletter subscriptions.
      </p>
      <p>Enjoy your readings!</p>
      <p>
        <a href="https://www.kill-the-newsletter.com">
          <strong>Create Another Inbox</strong>
        </a>
      </p>
    </>
  );
}

function Feed({ name, identifier }: { name: string; identifier: string }) {
  return {
    feed: {
      "@xmlns": "http://www.w3.org/2005/Atom",
      link: [
        {
          "@rel": "self",
          "@type": "application/atom+xml",
          "@href": feedURL(identifier)
        },
        {
          "@rel": "alternate",
          "@type": "text/html",
          "@href": "https://www.kill-the-newsletter.com/"
        }
      ],
      id: urn(identifier),
      title: name,
      subtitle: `Kill the Newsletter! Inbox: ${feedEmail(
        identifier
      )} → ${feedURL(identifier)}`,
      updated: now(),
      author: { name: "Kill the Newsletter!" },
      ...Entry({
        title: `“${name}” Inbox Created`,
        author: "Kill the Newsletter!",
        content: ReactDOMServer.renderToStaticMarkup(
          <Created identifier={identifier}></Created>
        )
      })
    }
  };
}

function Entry({
  title,
  author,
  content
}: {
  title: string;
  author: string;
  content: string;
}) {
  return {
    entry: {
      id: urn(createIdentifier()),
      title,
      author: { name: author },
      updated: now(),
      link: {
        "@rel": "alternate",
        "@type": "text/html",
        "@href": "https://www.kill-the-newsletter.com/entry"
      },
      content: { "@type": "html", "#": content }
    }
  };
}

function createIdentifier(): string {
  return cryptoRandomString({
    length: 20,
    characters: "1234567890qwertyuiopasdfghjklzxcvbnm"
  });
}

function now(): string {
  return new Date().toISOString();
}

function feedPath(identifier: string): string {
  return `static/feeds/${identifier}.xml`;
}

function feedURL(identifier: string): string {
  return `https://www.kill-the-newsletter.com/feeds/${identifier}.xml`;
}

function feedEmail(identifier: string): string {
  return `${identifier}@kill-the-newsletter.com`;
}

function urn(identifier: string): string {
  return `urn:kill-the-newsletter:${identifier}`;
}

function renderHTML(component: React.ReactElement): string {
  return `<!DOCTYPE html>\n${ReactDOMServer.renderToStaticMarkup(component)}`;
}

function renderXML(xml: object): string {
  return xmlbuilder2.convert({ invalidCharReplacement: "" }, xml, {
    format: "xml",
    noDoubleEncoding: true,
    prettyPrint: true
  });
}

function parseXML(xml: string): any {
  return xmlbuilder2.convert({ invalidCharReplacement: "" }, xml, {
    format: "object",
    noDoubleEncoding: true
  });
}
