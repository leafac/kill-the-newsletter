import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import childProcess from "node:child_process";
import stream from "node:stream/promises";
import server from "@radically-straightforward/server";
import * as serverTypes from "@radically-straightforward/server";
import sql, { Database } from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";
import * as caddy from "@radically-straightforward/caddy";
import cryptoRandomString from "crypto-random-string";
import { SMTPServer } from "smtp-server";
import * as mailParser from "mailparser";

const configuration: {
  hostname: string;
  administratorEmail: string;
  tls: { key: string; certificate: string };
  dataDirectory: string;
  environment: "production" | "development";
  hstsPreload: boolean;
  ports: number[];
} = (await import(path.resolve(process.argv[2]))).default;
configuration.dataDirectory ??= path.resolve("./data/");
configuration.environment ??= "production";
configuration.hstsPreload ??= false;
configuration.ports = Array.from(
  { length: os.availableParallelism() },
  (value, index) => 18000 + index,
);

await fs.mkdir(configuration.dataDirectory, { recursive: true });
const database = await new Database(
  path.join(configuration.dataDirectory, "kill-the-newsletter.db"),
).migrate(
  sql`
    CREATE TABLE "feeds" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "reference" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL
    ) STRICT;
    CREATE INDEX "feedsReference" ON "feeds" ("reference");
    CREATE TABLE "entries" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "reference" TEXT NOT NULL UNIQUE,
      "createdAt" TEXT NOT NULL,
      "feed" INTEGER NOT NULL REFERENCES "feeds" ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "content" TEXT NOT NULL
    );
    CREATE INDEX "entriesReference" ON "entries" ("reference");
    CREATE INDEX "entriesFeed" ON "entries" ("feed");
  `,
);

switch (process.env.TYPE) {
  case undefined: {
    utilities.log("KILL THE NEWSLETTER!", "2.0.0", "START");
    process.once("beforeExit", () => {
      utilities.log("KILL THE NEWSLETTER!", "STOP");
    });
    for (const port of configuration.ports)
      node.childProcessKeepAlive(() =>
        childProcess.spawn(process.argv[0], process.argv.slice(1), {
          env: {
            ...process.env,
            NODE_ENV: configuration.environment,
            TYPE: "web",
            PORT: String(port),
          },
          stdio: "inherit",
        }),
      );
    node.childProcessKeepAlive(() =>
      childProcess.spawn(process.argv[0], process.argv.slice(1), {
        env: {
          ...process.env,
          NODE_ENV: configuration.environment,
          TYPE: "email",
        },
        stdio: "inherit",
      }),
    );
    caddy.start({
      address: configuration.hostname,
      untrustedStaticFilesRoots: [],
      dynamicServerPorts: configuration.ports,
      email: configuration.administratorEmail,
      hstsPreload: configuration.hstsPreload,
    });
    break;
  }

  case "web": {
    const application = server({
      port: Number(process.env.PORT),
    });
    function layout(body: HTML): HTML {
      css`
        @import "@radically-straightforward/css/static/index.css";
        @import "@radically-straightforward/javascript/static/index.css";
        @import "@fontsource-variable/public-sans";
        @import "@fontsource-variable/public-sans/wght-italic.css";
        @import "bootstrap-icons/font/bootstrap-icons.css";
      `;
      javascript`
        import * as javascript from "@radically-straightforward/javascript/static/index.mjs";
      `;
      return html`
        <!doctype html>
        <html>
          <head>
            <link rel="stylesheet" href="/${caddy.staticFiles["index.css"]}" />
            <script src="/${caddy.staticFiles["index.mjs"]}"></script>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1, maximum-scale=1"
            />
          </head>
          <body
            css="${css`
              font-family: "Public Sans Variable",
                var(--font-family--sans-serif);
              font-size: var(--font-size--3-5);
              line-height: var(--font-size--3-5--line-height);
              background-color: var(--color--stone--50);
              color: var(--color--stone--800);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--stone--950);
                color: var(--color--stone--200);
              }
              padding: var(--space--4) var(--space--4);

              input[type="text"],
              button {
                background-color: var(--color--stone--100);
                padding: var(--space--1) var(--space--2);
                border: var(--border-width--1) solid var(--color--stone--400);
                border-radius: var(--border-radius--1);
                &:hover {
                  border-color: var(--color--stone--600);
                }
                &:focus-within {
                  border-color: var(--color--blue--400);
                }
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--stone--900);
                  border-color: var(--color--stone--600);
                  &:hover {
                    border-color: var(--color--stone--400);
                  }
                  &:focus-within {
                    border-color: var(--color--blue--600);
                  }
                }
                transition-property: var(--transition-property--colors);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--ease-in-out
                );
              }

              button {
                cursor: pointer;
              }

              a {
                cursor: pointer;
                text-decoration: underline;
                color: var(--color--blue--500);
                &:hover,
                &:focus-within {
                  color: var(--color--blue--400);
                }
                &:active {
                  color: var(--color--blue--600);
                }
                transition-property: var(--transition-property--colors);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--ease-in-out
                );
              }

              .secondary {
                font-size: var(--font-size--3);
                line-height: var(--font-size--3--line-height);
                font-weight: 700;
                color: var(--color--stone--500);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--stone--500);
                }
              }
            `}"
          >
            <div
              css="${css`
                max-width: var(--space--prose);
                margin: var(--space--0) auto;
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <div>
                <div
                  css="${css`
                    font-size: var(--font-size--4);
                    line-height: var(--font-size--4--line-height);
                    font-weight: 700;
                    display: flex;
                    gap: var(--space--2);
                  `}"
                >
                  <div>
                    <i class="bi bi-envelope-fill"></i> <i
                      class="bi bi-arrow-right"
                      > </i
                    ><i class="bi bi-rss-fill"></i>
                  </div>
                  <div>Kill the Newsletter!</div>
                </div>
                <div class="secondary">
                  Convert email newsletters into Atom feeds
                </div>
              </div>
              $${body}
            </div>
          </body>
        </html>
      `;
    }
    application.push({
      method: "GET",
      pathname: "/",
      handler: (request, response) => {
        response.end(
          // TODO: maxlength on ‘name="title"’
          layout(html`
            <form
              method="POST"
              action="/"
              novalidate
              css="${css`
                display: flex;
                gap: var(--space--2);
                @media (max-width: 400px) {
                  flex-direction: column;
                }
              `}"
            >
              <input
                type="text"
                name="title"
                placeholder="Feed title…"
                required
                autofocus
                css="${css`
                  flex: 1;
                `}"
              />
              <div><button>Create Feed</button></div>
            </form>

            <div class="secondary">
              Created by <a href="https://leafac.com">Leandro Facchinetti</a> ·
              <a href="https://github.com/leafac/kill-the-newsletter">Source</a
              > · Contribute via
              <a href="https://patreon.com/leafac">Patreon</a>,
              <a href="https://paypal.me/LeandroFacchinettiEU">PayPal</a>, or
              <a href="https://github.com/sponsors/leafac">GitHub</a>
            </div>
          `),
        );
      },
    });
    application.push({
      method: "POST",
      pathname: "/",
      handler: (
        request: serverTypes.Request<{}, {}, {}, { title: string }, {}>,
        response,
      ) => {
        if (typeof request.body.title !== "string" || request.body.title === "")
          throw "validation";
        const reference = cryptoRandomString({
          length: 20,
          characters: "abcdefghijklmnopqrstuvwxyz0123456789",
        });
        database.run(
          sql`
            INSERT INTO "feeds" ("reference", "title")
            VALUES (${reference}, ${request.body.title})
          `,
        );
        response.end(
          layout(html`
            <p>${reference}@${request.URL.hostname}</p>
            <p>${request.URL.origin}/feeds/${reference}.xml</p>
          `),
        );
      },
    });
    application.push({
      method: "GET",
      pathname: new RegExp("^/feeds/(?<feedReference>[A-Za-z0-9]+)\\.xml$"),
      handler: (
        request: serverTypes.Request<{ feedReference: string }, {}, {}, {}, {}>,
        response,
      ) => {
        if (typeof request.pathname.feedReference !== "string") return;
        const feed = database.get<{
          id: number;
          reference: string;
          title: string;
        }>(
          sql`
            SELECT "id", "reference", "title"
            FROM "feeds"
            WHERE "reference" = ${request.pathname.feedReference}
          `,
        );
        if (feed === undefined) return;
        const entries = database.all<{
          reference: string;
          createdAt: string;
          title: string;
          content: string;
        }>(
          sql`
            SELECT "reference", "createdAt", "title", "content"
            FROM "entries"
            WHERE "feed" = ${feed.id}
            ORDER BY "id" DESC
          `,
        );
        response
          .setHeader("Content-Type", "application/atom+xml; charset=utf-8")
          .end(html`
            <?xml version="1.0" encoding="utf-8"?>
            <feed xmlns="http://www.w3.org/2005/Atom">
              <id>urn:${feed.reference}</id>
              <link
                href="${request.URL.origin}/feeds/${feed.reference}.xml"
                rel="self"
              />
              <updated>
                ${entries[0]?.createdAt ?? "2000-01-01T00:00:00.000Z"}
              </updated>
              <title>${feed.title}</title>
              $${entries.map(
                (entry) => html`
                  <entry>
                    <id>urn:${entry.reference}</id>
                    <link
                      rel="alternate"
                      type="text/html"
                      href="${request.URL
                        .origin}/feeds/${feed.reference}/entries/${entry.reference}.html"
                    />
                    <published>${entry.createdAt}</published>
                    <title>${entry.title}</title>
                    <content type="html">${entry.content}</content>
                  </entry>
                `,
              )}
            </feed>
          `);
      },
    });
    application.push({
      method: "GET",
      pathname: new RegExp(
        "^/feeds/(?<feedReference>[A-Za-z0-9]+)/entries/(?<entryReference>[A-Za-z0-9]+)\\.html$",
      ),
      handler: (
        request: serverTypes.Request<
          {
            feedReference: string;
            entryReference: string;
          },
          {},
          {},
          {},
          {}
        >,
        response,
      ) => {
        if (
          typeof request.pathname.feedReference !== "string" ||
          typeof request.pathname.entryReference !== "string"
        )
          return;
        const entry = database.get<{
          content: string;
        }>(
          sql`
            SELECT "entries"."content" AS "content"
            FROM "entries"
            JOIN "feeds" ON
              "entries"."feed" = "feeds"."id" AND
              "feeds"."reference" = ${request.pathname.feedReference}
            WHERE "entries"."reference" = ${request.pathname.entryReference}
          `,
        );
        if (entry === undefined) return;
        response.end(entry.content);
      },
    });
    application.push({
      handler: (request, response) => {
        response.end(layout(html` <p>TODO: Not found.</p> `));
      },
    });
    application.push({
      error: true,
      handler: (request, response) => {
        response.end(layout(html` <p>TODO: Error.</p> `));
      },
    });
    break;
  }

  case "email": {
    utilities.log("EMAIL", "START");
    process.once("beforeExit", () => {
      utilities.log("EMAIL", "STOP");
    });
    const server = new SMTPServer({
      name: configuration.hostname,
      size: 2 ** 20,
      disabledCommands: ["AUTH"],
      key: await fs.readFile(configuration.tls.key, "utf-8"),
      cert: await fs.readFile(configuration.tls.certificate, "utf-8"),
      onData: async (emailStream, session, callback) => {
        try {
          if (
            ["TODO"].some(
              (hostname) =>
                session.envelope.mailFrom === false ||
                session.envelope.mailFrom.address.match(
                  utilities.emailRegExp,
                ) === null ||
                session.envelope.mailFrom.address.endsWith("@" + hostname),
            )
          )
            throw new Error("Invalid ‘mailFrom’.");
          const feeds = session.envelope.rcptTo.flatMap(({ address }) => {
            if (
              configuration.environment !== "development" &&
              address.match(utilities.emailRegExp) === null
            )
              return [];
            const [feedReference, hostname] = address.split("@");
            if (hostname !== configuration.hostname) return [];
            const feed = database.get<{ id: number; reference: string }>(
              sql`
                SELECT "id", "reference" FROM "feeds" WHERE "reference" = ${feedReference}
              `,
            );
            if (feed === undefined) return [];
            return [feed];
          });
          if (feeds.length === 0) throw new Error("No valid recipients.");
          const email = await mailParser.simpleParser(emailStream);
          if (emailStream.sizeExceeded) throw new Error("Email is too big.");
          for (const feed of feeds) {
            const reference = cryptoRandomString({
              length: 20,
              characters: "abcdefghijklmnopqrstuvwxyz0123456789",
            });
            const deletedEntriesReferences = new Array<string>();
            database.executeTransaction(() => {
              database.run(
                sql`
                  INSERT INTO "entries" (
                    "reference",
                    "createdAt",
                    "feed",
                    "title",
                    "content"
                  )
                  VALUES (
                    ${reference},
                    ${new Date().toISOString()},
                    ${feed.id},
                    ${email.subject ?? "Untitled"},
                    ${typeof email.html === "string" ? email.html : typeof email.textAsHtml === "string" ? email.textAsHtml : "No content."}
                  )
                `,
              );
              const entries = database.all<{
                id: number;
                reference: string;
                title: string;
                content: string;
              }>(
                sql`
                  SELECT "id", "reference", "title", "content"
                  FROM "entries"
                  WHERE "feed" = ${feed.id}
                  ORDER BY "id" ASC
                `,
              );
              let contentLength = 0;
              while (entries.length > 0) {
                const entry = entries.pop()!;
                contentLength += entry.title.length + entry.content.length;
                if (contentLength > 2 ** 20) break;
              }
              for (const entry of entries) {
                database.run(
                  sql`
                    DELETE FROM "entries" WHERE "id" = ${entry.id}
                  `,
                );
                deletedEntriesReferences.push(entry.reference);
              }
            });
            utilities.log(
              "EMAIL",
              "SUCCESS",
              "FEED",
              String(feed.reference),
              "ENTRY",
              reference,
              session.envelope.mailFrom === false
                ? ""
                : session.envelope.mailFrom.address,
              "DELETED ENTRIES",
              JSON.stringify(deletedEntriesReferences),
            );
          }
        } catch (error) {
          utilities.log(
            "EMAIL",
            "ERROR",
            session.envelope.mailFrom === false
              ? ""
              : session.envelope.mailFrom.address,
            String(error),
          );
        } finally {
          emailStream.resume();
          await stream.finished(emailStream);
          callback();
        }
      },
    });
    server.listen(25);
    process.once("gracefulTermination", () => {
      server.close();
    });
    for (const file of [configuration.tls.key, configuration.tls.certificate])
      fsSync
        .watchFile(file, () => {
          node.exit();
        })
        .unref();
    break;
  }
}
