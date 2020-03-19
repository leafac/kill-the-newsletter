import express from "express";
import React from "react";
import fs from "fs";
import ReactDOMServer from "react-dom/server";
import { Builder } from "xml2js";
import cryptoRandomString from "crypto-random-string";

export const webServer = express()
  .use(express.static("static"))
  .use(express.urlencoded({ extended: true }))
  .get("/", (req, res) =>
    res.send(
      renderHtml(
        <Layout>
          <Form></Form>
        </Layout>
      )
    )
  )
  .post("/", (req, res) => {
    const inbox: Inbox = { name: req.body.name, token: newToken() };
    fs.writeFileSync(feedPath(inbox.token), renderXml(Feed(inbox)));
    res.send(
      renderHtml(
        <Layout>
          <Created inbox={inbox}></Created>
        </Layout>
      )
    );
  })
  .listen(8443);

type Inbox = {
  name: string;
  token: string;
};

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
        <link rel="stylesheet" type="text/css" href="styles.css" />
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

function Created({ inbox: { name, token } }: { inbox: Inbox }) {
  return (
    <>
      <h1>“{name}” Inbox Created</h1>
      <p>
        Sign up for the newsletter with
        <br />
        <code>{feedEmail(token)}</code>
      </p>
      <p>
        Subscribe to the Atom feed at
        <br />
        <code>{feedUrl(token)}</code>
      </p>
      <p>
        Don’t share these addresses.
        <br />
        They contain a security token that other people could use
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

// https://validator.w3.org/feed/docs/atom.html
// https://validator.w3.org/feed/#validate_by_input

function Feed(inbox: Inbox) {
  const { name, token } = inbox;
  return {
    feed: {
      $: { xmlns: "http://www.w3.org/2005/Atom" },
      link: [
        {
          $: {
            rel: "self",
            type: "application/atom+xml",
            href: feedUrl(token)
          }
        },
        {
          $: {
            rel: "alternate",
            type: "text/html",
            href: "https://www.kill-the-newsletter.com/"
          }
        }
      ],
      id: id(token),
      title: name,
      subtitle: `Kill the Newsletter! Inbox “${feedEmail(token)}”`,
      updated: now(),
      ...Entry({
        title: `“${name}” Inbox Created`,
        author: "Kill the Newsletter!",
        content: ReactDOMServer.renderToStaticMarkup(
          <Created inbox={inbox}></Created>
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
      id: id(newToken()),
      title,
      author: { name: author },
      updated: now(),
      content: { $: { type: "html" }, _: content }
    }
  };
}

function newToken() {
  return cryptoRandomString({
    length: 20,
    characters: "1234567890qwertyuiopasdfghjklzxcvbnm"
  });
}

function now() {
  return new Date().toISOString();
}

export function feedPath(token: string) {
  return `static/feeds/${token}.xml`;
}

function feedUrl(token: string) {
  return `https://www.kill-the-newsletter.com/feeds/${token}.xml`;
}

function feedEmail(token: string) {
  return `${token}@kill-the-newsletter.com`;
}

function id(token: string) {
  return `urn:kill-the-newsletter:${token}`;
}

function renderHtml(component: React.ReactElement): string {
  return `<!DOCTYPE html>\n${ReactDOMServer.renderToStaticMarkup(component)}`;
}

function renderXml(xml: object): string {
  return new Builder().buildObject(xml);
}
