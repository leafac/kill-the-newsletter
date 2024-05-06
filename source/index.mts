import util from "node:util";
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
    CREATE TABLE "inboxes" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "reference" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL
    ) STRICT;
    CREATE INDEX "inboxesReference" ON "inboxes" ("reference");
    CREATE TABLE "entries" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "reference" TEXT NOT NULL UNIQUE,
      "createdAt" TEXT NOT NULL,
      "inbox" INTEGER NOT NULL REFERENCES "inboxes" ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "content" TEXT NOT NULL
    );
    CREATE INDEX "entriesReference" ON "entries" ("reference");
    CREATE INDEX "entriesInbox" ON "entries" ("inbox");
  `,
);

switch (process.env.TYPE) {
  case undefined: {
    utilities.log("KILL-THE-NEWSLETTER", "2.0.0", "START");
    process.once("beforeExit", () => {
      utilities.log("KILL-THE-NEWSLETTER", "STOP");
    });
    for (const port of configuration.ports)
      node.childProcessKeepAlive(() =>
        childProcess.spawn(process.execPath, process.argv.slice(1), {
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
      childProcess.spawn(process.execPath, process.argv.slice(1), {
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
    function layout({
      request,
      response,
      body,
    }: {
      request: serverTypes.Request<{}, {}, {}, {}, {}>;
      response: serverTypes.Response;
      body: HTML;
    }): HTML {
      css`
        @import "@radically-straightforward/css/static/index.css";
        @import "@radically-straightforward/javascript/static/index.css";
        @import "@fontsource-variable/public-sans";
        @import "@fontsource-variable/public-sans/wght-italic.css";
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
                transition-duration: var(--transition-duration--200);
                transition-timing-function: var(
                  --transition-timing-function--ease-in-out
                );
              }

              button {
                cursor: pointer;
              }
            `}"
          >
            <div
              css="${css`
                max-width: var(--space--prose);
                margin: var(--space--0) auto;
              `}"
            >
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
          layout({
            request,
            response,
            body: html`
              <form
                method="POST"
                action="/"
                novalidate
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                `}"
              >
                <input
                  type="text"
                  name="name"
                  placeholder="Inbox name…"
                  required
                  autofocus
                />
                <div><button>Create Inbox</button></div>
              </form>
            `,
          }),
        );
      },
    });
    application.push({
      method: "POST",
      pathname: "/",
      handler: (
        request: serverTypes.Request<{}, {}, {}, { name: string }, {}>,
        response,
      ) => {
        if (typeof request.body.name !== "string" || request.body.name === "")
          throw "validation";
        const reference = cryptoRandomString({
          length: 20,
          characters: "abcdefghijklmnopqrstuvwxyz0123456789",
        });
        database.run(
          sql`
            INSERT INTO "inboxes" ("reference", "name")
            VALUES (${reference}, ${request.body.name})
          `,
        );
        response.end(
          layout({
            request,
            response,
            body: html`
              <p>${reference}@${request.URL.hostname}</p>
              <p>${request.URL.origin}/feeds/${reference}.xml</p>
            `,
          }),
        );
      },
    });
    application.push({
      method: "GET",
      pathname: new RegExp("^/feeds/(?<inboxReference>[A-Za-z0-9]+)\\.xml$"),
      handler: (
        request: serverTypes.Request<
          { inboxReference: string },
          {},
          {},
          {},
          {}
        >,
        response,
      ) => {
        if (typeof request.pathname.inboxReference !== "string") return;
        const inbox = database.get<{
          id: number;
          reference: string;
          title: string;
        }>(
          sql`
            SELECT "id", "reference", "title"
            FROM "inboxes"
            WHERE "reference" = ${request.pathname.inboxReference}
          `,
        );
        if (inbox === undefined) return;
        const entries = database.all<{
          reference: string;
          createdAt: string;
          title: string;
          content: string;
        }>(
          sql`
            SELECT "reference", "createdAt", "title", "content"
            FROM "entries"
            WHERE "inbox" = ${inbox.id}
            ORDER BY "id" DESC
          `,
        );
        response
          .setHeader("Content-Type", "application/atom+xml; charset=utf-8")
          .end(html`
            <?xml version="1.0" encoding="utf-8"?>
            <feed xmlns="http://www.w3.org/2005/Atom">
              <id>urn:${inbox.reference}</id>
              <link
                href="${request.URL.origin}/feeds/${inbox.reference}.xml"
                rel="self"
              />
              <updated>
                ${entries[0]?.createdAt ?? "2003-12-13T18:30:02Z"}
              </updated>
              <title>${inbox.title}</title>
              $${entries.map(
                (entry) => html`
                  <entry>
                    <id>urn:${entry.reference}</id>
                    <link
                      rel="alternate"
                      type="text/html"
                      href="${request.URL
                        .origin}/feeds/${inbox.reference}/entries/${entry.reference}.html"
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
        "^/feeds/(?<inboxReference>[A-Za-z0-9]+)/entries/(?<entryReference>[A-Za-z0-9]+)\\.html$",
      ),
      handler: (
        request: serverTypes.Request<
          {
            inboxReference: string;
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
          typeof request.pathname.inboxReference !== "string" ||
          typeof request.pathname.entryReference !== "string"
        )
          return;
        const entry = database.get<{
          content: string;
        }>(
          sql`
            SELECT "entries"."content" AS "content"
            FROM "entries"
            JOIN "inboxes" ON
              "entry"."inbox" = "inboxes"."id" AND
              "inboxes"."reference" = ${request.pathname.inboxReference}
            WHERE "entries"."reference" = ${request.pathname.inboxReference}
          `,
        );
        if (entry === undefined) return;
        response.end(entry.content);
      },
    });
    application.push({
      handler: (request, response) => {
        response.end(
          layout({ request, response, body: html` <p>TODO: Not found.</p> ` }),
        );
      },
    });
    application.push({
      error: true,
      handler: (request, response) => {
        response.end(
          layout({ request, response, body: html` <p>TODO: Error.</p> ` }),
        );
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
          const inboxesIds = session.envelope.rcptTo.flatMap(({ address }) => {
            if (
              configuration.environment !== "development" &&
              address.match(utilities.emailRegExp) === null
            )
              return [];
            const [inboxReference, hostname] = address.split("@");
            if (hostname !== configuration.hostname) return [];
            const inbox = database.get<{ id: number }>(
              sql`
                SELECT "id" FROM "inboxes" WHERE "reference" = ${inboxReference}
              `,
            );
            if (inbox === undefined) return [];
            return [inbox.id];
          });
          if (inboxesIds.length === 0) throw new Error("No valid recipients.");
          const email = await mailParser.simpleParser(emailStream);
          if (emailStream.sizeExceeded) throw new Error("Email is too big.");
          for (const inboxId of inboxesIds) {
            database.run(
              sql`
                INSERT INTO "entries" (
                  "reference",
                  "createdAt",
                  "inbox",
                  "title",
                  "content"
                )
                VALUES (
                  ${cryptoRandomString({
                    length: 20,
                    characters: "abcdefghijklmnopqrstuvwxyz0123456789",
                  })},
                  ${new Date().toISOString()},
                  ${inboxId},
                  ${email.subject ?? "Untitled"},
                  ${typeof email.html === "string" ? email.html : typeof email.textAsHtml === "string" ? email.textAsHtml : "No content."}
                )
              `,
            );
            utilities.log("EMAIL", "SUCCESS", String(inboxId));
          }
        } catch (error) {
          utilities.log("EMAIL", "ERROR", String(error));
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
