import React from "react";
import ReactDOMServer from "react-dom/server";
import cryptoRandomString from "crypto-random-string";

export type Inbox = {
  name: string;
  token: string;
};

export class Layout extends React.Component {
  render() {
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
          <main>{this.props.children}</main>
          <footer>
            <p>
              By <a href="https://www.leafac.com">Leandro Facchinetti</a> ·{" "}
              <a href="https://github.com/leafac/www.kill-the-newsletter.com">
                Source
              </a>{" "}
              ·{" "}
              <a href="mailto:kill-the-newsletter@leafac.com">
                Report an Issue
              </a>
            </p>
          </footer>
        </body>
      </html>
    );
  }
}

export class Form extends React.Component {
  render() {
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
}

export class Created extends React.Component<{ inbox: Inbox }> {
  render() {
    const { name, token } = this.props.inbox;
    return (
      <>
        <h1>“{name}” Inbox Created</h1>
        <p>
          Sign up for the newsletter with
          <br />
          <code>{token}@kill-the-newsletter.com</code>
        </p>
        <p>
          Subscribe to the Atom feed at
          <br />
          <code>
            https://www.kill-the-newsletter.com/feeds/{token}
            .xml
          </code>
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
}

// https://validator.w3.org/feed/docs/atom.html

export function Feed(inbox: Inbox): object {
  const { name, token } = inbox;
  return {
    feed: {
      $: { xmlns: "http://www.w3.org/2005/Atom" },
      link: [
        {
          $: {
            rel: "self",
            type: "application/atom+xml",
            href: `https://www.kill-the-newsletter.com/feeds/${token}.xml`
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
      subtitle: `Kill the Newsletter! Inbox “${token}@kill-the-newsletter.com”`,
      updated: now(),
      ...Entry({
        title: `“#${name}” Inbox Created`,
        author: "Kill the Newsletter!",
        content: ReactDOMServer.renderToStaticMarkup(
          <Created inbox={inbox}></Created>
        )
      })
    }
  };
}

export function Entry({
  title,
  author,
  content
}: {
  title: string;
  author: string;
  content: string;
}): object {
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

export function newToken(): string {
  return cryptoRandomString({
    length: 20,
    characters: "1234567890qwertyuiopasdfghjklzxcvbnm"
  });
}

export function now(): string {
  return new Date().toISOString();
}

export function feedPath(token: string): string {
  return `static/feeds/${token}.xml`;
}

export function id(token: string): string {
  return `urn:kill-the-newsletter:${token}`;
}
