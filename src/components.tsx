import React from "react";

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
