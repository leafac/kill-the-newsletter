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

export class Created extends React.Component<{ name: string; token: string }> {
  render() {
    return (
      <>
        <h1>“{this.props.name}” Inbox Created</h1>
        <p>
          Sign up for the newsletter with
          <br />
          <code>{this.props.token}@kill-the-newsletter.com</code>
        </p>
        <p>
          Subscribe to the Atom feed at
          <br />
          <code>
            https://www.kill-the-newsletter.com/feeds/{this.props.token}.xml
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
