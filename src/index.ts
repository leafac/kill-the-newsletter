#!/usr/bin/env node

import path from "path";
import express from "express";
import { SMTPServer } from "smtp-server";
import mailparser from "mailparser";
import fs from "fs-extra";
import cryptoRandomString from "crypto-random-string";
import { html, HTML } from "@leafac/html";
import { css, process as processCSS } from "@leafac/css";
import javascript from "tagged-template-noop";
import { sql, Database } from "@leafac/sqlite";
import databaseMigrate from "@leafac/sqlite-migration";

const VERSION = require("../package.json").version;

export default function killTheNewsletter(
  rootDirectory: string
): { webApplication: express.Express; emailApplication: SMTPServer } {
  const webApplication = express();

  webApplication.set("url", "http://localhost:4000");
  webApplication.set("email", "smtp://localhost:2525");
  webApplication.set("administrator", "mailto:kill-the-newsletter@leafac.com");

  fs.ensureDirSync(rootDirectory);
  const database = new Database(
    path.join(rootDirectory, "kill-the-newsletter.db")
  );
  databaseMigrate(database, [
    sql`
      CREATE TABLE "feeds" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reference" TEXT NOT NULL UNIQUE,
        "title" TEXT NOT NULL
      );

      CREATE TABLE "entries" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reference" TEXT NOT NULL UNIQUE,
        "feed" INTEGER NOT NULL REFERENCES "feeds",
        "title" TEXT NOT NULL,
        "author" TEXT NOT NULL,
        "content" TEXT NOT NULL
      );
    `,
    sql`
      CREATE INDEX "entriesFeed" ON "entries" ("feed");
    `,
  ]);

  webApplication.use(express.static(path.join(__dirname, "../public")));
  webApplication.use(express.urlencoded({ extended: true }));

  const logo = fs.readFileSync(path.join(__dirname, "../public/logo.svg"));

  function layout(body: HTML): HTML {
    return processCSS(html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <meta name="generator" content="Kill the Newsletter!/${VERSION}" />
          <meta
            name="description"
            content="Convert email newsletters into Atom feeds."
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="${webApplication.get("url")}/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="${webApplication.get("url")}/favicon-16x16.png"
          />
          <link
            rel="icon"
            type="image/x-icon"
            href="${webApplication.get("url")}/favicon.ico"
          />
          <title>Kill the Newsletter!</title>
        </head>
        <body
          style="${css`
            @at-root {
              body {
                font-size: 0.875rem;
                -webkit-text-size-adjust: 100%;
                line-height: 1.5;
                font-family: --apple-system, BlinkMacSystemFont, "Segoe UI",
                  Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans",
                  "Helvetica Neue", sans-serif;
                max-width: 450px;
                padding: 0 1rem;
                margin: 1rem auto;
                text-align: center;
                overflow-wrap: break-word;

                @media (prefers-color-scheme: dark) {
                  color: #d4d4d4;
                  background-color: #1e1e1e;
                }
              }

              code {
                font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo,
                  monospace;
              }

              h1 {
                font-size: 1.3rem;
              }

              footer {
                font-size: 0.75rem;
              }

              a {
                color: inherit;
                transition: color 0.2s;

                &:hover {
                  color: #29adff;
                }

                h1 &,
                footer & {
                  text-decoration: none;
                }
              }

              input,
              button {
                all: unset;
                padding: 0.1rem 1rem;
                border: 1px solid gainsboro;
                border-radius: 5px;
                box-shadow: inset 0 1px 1px #ffffff10, 0 1px 3px #00000010;
                transition: border-color 0.2s;

                @media (prefers-color-scheme: dark) {
                  border-color: dimgray;
                }

                @supports (-webkit-touch-callout: none) {
                  font-size: 16px;
                }

                &:focus {
                  border-color: #29adff;
                }
              }

              button {
                background-color: white;

                @media (prefers-color-scheme: dark) {
                  background-color: #5a5a5a;
                }

                &:active {
                  color: white;
                  background-color: #29adff;
                }
              }
            }
          `}"
        >
          <header>
            <h1>
              <a href="${webApplication.get("url")}/">Kill the Newsletter!</a>
            </h1>
            <p>Convert email newsletters into Atom feeds</p>
            <p
              style="${css`
                @media (prefers-color-scheme: dark) {
                  path {
                    fill: #d4d4d4;
                  }
                }
              `}"
            >
              $${logo}
            </p>
          </header>
          <main>$${body}</main>
          <footer>
            <p>
              By <a href="https://leafac.com">Leandro Facchinetti</a> ·
              <a href="https://patreon.com/leafac">Patreon</a> ·
              <a href="https://paypal.me/LeandroFacchinetti">PayPal</a> ·
              <a href="https://github.com/leafac/kill-the-newsletter.com"
                >Source</a
              > ·
              <a href="${webApplication.get("administrator")}"
                >Report an issue</a
              >
            </p>
          </footer>
          <script>
            for (const copyable of document.querySelectorAll(".copyable"))
              copyable.insertAdjacentHTML(
                "afterend",
                $${"`"}$${html`<br />
                  <button
                    type="button"
                    onclick="${javascript`
                      (async () => {
                        await navigator.clipboard.writeText("\${copyable.textContent}");
                        const originalTextContent = this.textContent;
                        this.textContent = "Copied";
                        await new Promise(resolve => window.setTimeout(resolve, 500));
                        this.textContent = originalTextContent;
                      })();
                    `}"
                  >
                    Copy
                  </button>`}$${"`"}
              );
          </script>
        </body>
      </html>
    `);
  }

  webApplication.get<{}, HTML, {}, {}, {}>("/", (req, res) => {
    res.send(
      layout(html`
        <form
          method="POST"
          action="${webApplication.get("url")}"
          style="${css`
            max-width: 300px;
            margin: 0 auto;

            input,
            button {
              box-sizing: border-box;
              width: 100%;
            }
          `}"
        >
          <p>
            <input
              type="text"
              name="name"
              placeholder="Newsletter name…"
              maxlength="500"
              required
              pattern=".*\\S.*"
              autocomplete="off"
              autofocus
            />
          </p>
          <p>
            <button>Create Inbox</button>
          </p>
        </form>
      `)
    );
  });

  webApplication.post<{}, HTML, { name?: string }, {}, {}>("/", (req, res) => {
    if (
      typeof req.body.name !== "string" ||
      req.body.name.trim() === "" ||
      req.body.name.length > 500
    )
      return res.status(422).send(
        layout(
          html`
            <p>
              Error: Missing newsletter name.
              <a href="${webApplication.get("url")}/"
                ><strong>Try again</strong></a
              >.
            </p>
          `
        )
      );

    const feedReference = newReference();
    const welcomeTitle = `“${req.body.name}” inbox created`;
    const welcomeContent = html`
      <p>
        Sign up for the newsletter with<br />
        <code class="copyable"
          >${feedReference}@${new URL(webApplication.get("email"))
            .hostname}</code
        >
      </p>
      <p>
        Subscribe to the Atom feed at<br />
        <code class="copyable"
          >${webApplication.get("url")}/feeds/${feedReference}.xml</code
        >
      </p>
      <p>
        <strong>Don’t share these addresses.</strong><br />
        They contain an identifier that other people could use to send you spam
        and to control your newsletter subscriptions.
      </p>
      <p><strong>Enjoy your readings!</strong></p>
      <p>
        <a href="${webApplication.get("url")}/"
          ><strong>Create another inbox</strong></a
        >
      </p>
    `;

    database.executeTransaction(() => {
      const feedId = database.run(
        sql`INSERT INTO "feeds" ("reference", "title") VALUES (${feedReference}, ${req.body.name})`
      ).lastInsertRowid;
      database.run(
        sql`
          INSERT INTO "entries" ("reference", "feed", "title", "author", "content")
          VALUES (
            ${newReference()},
            ${feedId},
            ${welcomeTitle},
            ${"Kill the Newsletter!"},
            ${welcomeContent}
          )
      `
      );
    });

    res.send(
      layout(html`
        <p><strong>${welcomeTitle}</strong></p>
        $${welcomeContent}
      `)
    );
  });

  function renderFeed(feedReference: string): HTML | undefined {
    const feed = database.get<{
      id: number;
      updatedAt: string;
      title: string;
    }>(
      sql`SELECT "id", "updatedAt", "title" FROM "feeds" WHERE "reference" = ${feedReference}`
    );
    if (feed === undefined) return;

    const entries = database.all<{
      createdAt: string;
      reference: string;
      title: string;
      author: string;
      content: string;
    }>(
      sql`
        SELECT "createdAt", "reference", "title", "author", "content"
        FROM "entries"
        WHERE "feed" = ${feed.id}
        ORDER BY "id" DESC
      `
    );

    return html`
      <?xml version="1.0" encoding="utf-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <link
          rel="self"
          type="application/atom+xml"
          href="${webApplication.get("url")}/feeds/${feedReference}.xml"
        />
        <link
          rel="alternate"
          type="text/html"
          href="${webApplication.get("url")}/"
        />
        <id>urn:kill-the-newsletter:${feedReference}</id>
        <title>${feed.title}</title>
        <subtitle
          >Kill the Newsletter! Inbox:
          ${feedReference}@${new URL(webApplication.get("email")).hostname} →
          ${webApplication.get("url")}/feeds/${feedReference}.xml</subtitle
        >
        <updated>${new Date(feed.updatedAt).toISOString()}</updated>
        <author><name>Kill the Newsletter!</name></author>
        $${entries.map(
          (entry) => html`
            <entry>
              <id>urn:kill-the-newsletter:${entry.reference}</id>
              <title>${entry.title}</title>
              <author><name>${entry.author}</name></author>
              <updated>${new Date(entry.createdAt).toISOString()}</updated>
              <link
                rel="alternate"
                type="text/html"
                href="${webApplication.get(
                  "url"
                )}/alternates/${entry.reference}.html"
              />
              <content type="html">${entry.content}</content>
            </entry>
          `
        )}
      </feed>
    `.trim();
  }

  webApplication.get<{ feedReference: string }, HTML, {}, {}, {}>(
    "/feeds/:feedReference.xml",
    (req, res, next) => {
      const feed = renderFeed(req.params.feedReference);
      if (feed === undefined) return next();
      res.type("atom").header("X-Robots-Tag", "noindex").send(feed);
    }
  );

  webApplication.get<{ entryReference: string }, HTML, {}, {}, {}>(
    "/alternates/:entryReference.html",
    (req, res, next) => {
      const entry = database.get<{ content: string }>(
        sql`SELECT "content" FROM "entries" WHERE "reference" = ${req.params.entryReference}`
      );
      if (entry === undefined) return next();
      res.header("X-Robots-Tag", "noindex").send(entry.content);
    }
  );

  webApplication.use((req, res) => {
    res.send(
      layout(html`
        <p><strong>404 Not found</strong></p>
        <p>
          <a href="${webApplication.get("url")}/"
            ><strong>Create a new inbox</strong></a
          >
        </p>
      `)
    );
  });

  const emailApplication = new SMTPServer({
    disabledCommands: ["AUTH", "STARTTLS"],
    async onData(stream, session, callback) {
      try {
        const email = await mailparser.simpleParser(stream);
        const from = email.from?.text ?? "";
        const subject = email.subject ?? "";
        const body =
          typeof email.html === "string" ? email.html : email.textAsHtml ?? "";
        database.executeTransaction(() => {
          for (const address of new Set(
            session.envelope.rcptTo.map(
              (smtpServerAddress) => smtpServerAddress.address
            )
          )) {
            const addressParts = address.split("@");
            if (addressParts.length !== 2) continue;
            const [feedReference, hostname] = addressParts;
            if (hostname !== new URL(webApplication.get("email")).hostname)
              continue;
            const feed = database.get<{ id: number }>(
              sql`SELECT "id" FROM "feeds" WHERE "reference" = ${feedReference}`
            );
            if (feed === undefined) continue;
            database.run(
              sql`
                INSERT INTO "entries" ("reference", "feed", "title", "author", "content")
                VALUES (
                  ${newReference()},
                  ${feed.id},
                  ${subject},
                  ${from},
                  ${body}
                )
              `
            );
            database.run(
              sql`UPDATE "feeds" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${feed.id}`
            );
            while (renderFeed(feedReference)!.length > 500_000)
              database.run(
                sql`DELETE FROM "entries" WHERE "feed" = ${feed.id} ORDER BY "id" ASC LIMIT 1`
              );
          }
        });
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
  });

  function newReference(): string {
    return cryptoRandomString({
      length: 16,
      characters: "abcdefghijklmnopqrstuvwxyz0123456789",
    });
  }

  return { webApplication, emailApplication };
}

if (require.main === module) {
  console.log(`Kill the Newsletter!/${VERSION}`);
  const configurationFile =
    process.argv[2] === undefined ? undefined : path.resolve(process.argv[2]);
  if (configurationFile === undefined) {
    const { webApplication, emailApplication } = killTheNewsletter(
      path.join(process.cwd(), "data")
    );
    webApplication.listen(new URL(webApplication.get("url")).port, () => {
      console.log(`Web server started at ${webApplication.get("url")}`);
    });
    emailApplication.listen(new URL(webApplication.get("email")).port, () => {
      console.log(`Email server started at ${webApplication.get("email")}`);
    });
  } else {
    require(configurationFile)(require);
    console.log(`Configuration loaded from ‘${configurationFile}’.`);
  }
}
