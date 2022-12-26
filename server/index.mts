#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import timers from "node:timers/promises";
import os from "node:os";
import * as commander from "commander";
import express from "express";
import nodemailer from "nodemailer";
import sql, { Database } from "@leafac/sqlite";
import html, { HTML } from "@leafac/html";
import css, { localCSS } from "@leafac/css";
import javascript, { localJavaScript } from "@leafac/javascript";
import lodash from "lodash";
import { execa, ExecaChildProcess } from "execa";
import caddyfile from "dedent";
import dedent from "dedent";

if (process.env.TEST === "kill-the-newsletter") {
  delete process.env.TEST;

  // import { jest, test, expect } from "@jest/globals";
  // import os from "os";
  // import path from "path";
  // import fs from "fs";
  // import * as got from "got";
  // import nodemailer from "nodemailer";
  // import html from "@leafac/html";
  // import killTheNewsletter from ".";

  // jest.setTimeout(300_000);

  // test("Kill the Newsletter!", async () => {
  //   // Start servers
  //   const rootDirectory = fs.mkdtempSync(
  //     path.join(os.tmpdir(), "kill-the-newsletter--test--")
  //   );
  //   const { webApplication, emailApplication } = killTheNewsletter(rootDirectory);
  //   const webServer = webApplication.listen(
  //     new URL(webApplication.get("url")).port
  //   );
  //   const emailServer = emailApplication.listen(
  //     new URL(webApplication.get("email")).port
  //   );
  //   const webClient = got.default.extend({
  //     prefixUrl: webApplication.get("url"),
  //   });
  //   const emailClient = nodemailer.createTransport(webApplication.get("email"));
  //   const emailHostname = new URL(webApplication.get("url")).hostname;

  //   // Create feed
  //   const create = (await webClient.post("", { form: { name: "A newsletter" } }))
  //     .body;
  //   expect(create).toMatch(`“A newsletter” inbox created`);
  //   const feedReference = create.match(/\/feeds\/([a-z0-9]{16})\.xml/)![1];

  //   // Test feed properties
  //   const feedOriginal = await webClient.get(`feeds/${feedReference}.xml`);
  //   expect(feedOriginal.headers["content-type"]).toMatch("application/atom+xml");
  //   expect(feedOriginal.headers["x-robots-tag"]).toBe("noindex");
  //   expect(feedOriginal.body).toMatch(html`<title>A newsletter</title>`);

  //   // Test alternate
  //   const alternateReference = feedOriginal.body.match(
  //     /\/alternates\/([a-z0-9]{16})\.html/
  //   )![1];
  //   const alternate = await webClient.get(
  //     `alternates/${alternateReference}.html`
  //   );
  //   expect(alternate.headers["content-type"]).toMatch("text/html");
  //   expect(alternate.headers["x-robots-tag"]).toBe("noindex");
  //   expect(alternate.body).toMatch(`Enjoy your readings!`);

  //   // Test email with HTML
  //   await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for a second to test that the ‘<updated>’ field will be updated
  //   await emailClient.sendMail({
  //     from: "publisher@example.com",
  //     to: `${feedReference}@${emailHostname}`,
  //     subject: "Test email with HTML",
  //     html: html`<p>Some HTML</p>`,
  //   });
  //   const feedWithHTMLEntry = (await webClient.get(`feeds/${feedReference}.xml`))
  //     .body;
  //   expect(feedWithHTMLEntry.match(/<updated>(.+?)<\/updated>/)![1]).not.toBe(
  //     feedOriginal.body.match(/<updated>(.+?)<\/updated>/)![1]
  //   );
  //   expect(feedWithHTMLEntry).toMatch(
  //     html`<author><name>publisher@example.com</name></author>`
  //   );
  //   expect(feedWithHTMLEntry).toMatch(html`<title>Test email with HTML</title>`);
  //   expect(feedWithHTMLEntry).toMatch(
  //     // prettier-ignore
  //     html`<content type="html">${`<p>Some HTML</p>`}\n</content>`
  //   );

  //   // Test email with text
  //   await emailClient.sendMail({
  //     from: "publisher@example.com",
  //     to: `${feedReference}@${emailHostname}`,
  //     subject: "Test email with text",
  //     text: "A link: https://kill-the-newsletter.com",
  //   });
  //   expect((await webClient.get(`feeds/${feedReference}.xml`)).body).toMatch(
  //     // prettier-ignore
  //     html`<content type="html">${`<p>A link: <a href="https://kill-the-newsletter.com">https://kill-the-newsletter.com</a></p>`}</content>`
  //   );

  //   // Test email missing fields
  //   await emailClient.sendMail({
  //     to: `${feedReference}@${emailHostname}`,
  //   });
  //   const feedMissingFields = (await webClient.get(`feeds/${feedReference}.xml`))
  //     .body;
  //   expect(feedMissingFields).toMatch(html`<author><name></name></author>`);
  //   expect(feedMissingFields).toMatch(html`<title></title>`);
  //   expect(feedMissingFields).toMatch(html`<content type="html"></content>`);

  //   // Test email to nonexistent ‘to’ (gets ignored)
  //   await emailClient.sendMail({
  //     from: "publisher@example.com",
  //     to: `nonexistent@${emailHostname}`,
  //     subject: "Test email to nonexistent ‘to’ (gets ignored)",
  //     text: "A link: https://kill-the-newsletter.com",
  //   });
  //   expect((await webClient.get(`feeds/${feedReference}.xml`)).body).not.toMatch(
  //     "Test email to nonexistent ‘to’ (gets ignored)"
  //   );

  //   // Test truncation
  //   for (let index = 1; index <= 5; index++)
  //     await emailClient.sendMail({
  //       from: "publisher@example.com",
  //       to: `${feedReference}@${emailHostname}`,
  //       subject: `Test truncation: ${index}`,
  //       text: `TRUNCATION ${index} `.repeat(10_000),
  //     });
  //   const feedTruncated = (await webClient.get(`feeds/${feedReference}.xml`))
  //     .body;
  //   expect(feedTruncated).toMatch("TRUNCATION 5");
  //   expect(feedTruncated).not.toMatch("TRUNCATION 1");

  //   // Test email that’s too long
  //   await emailClient.sendMail({
  //     from: "publisher@example.com",
  //     to: `${feedReference}@${emailHostname}`,
  //     subject: "Test email that’s too long",
  //     text: `TOO LONG `.repeat(100_000),
  //   });
  //   const feedEvenMoreTruncated = (
  //     await webClient.get(`feeds/${feedReference}.xml`)
  //   ).body;
  //   expect(feedEvenMoreTruncated).not.toMatch("TOO LONG");
  //   expect(feedEvenMoreTruncated).not.toMatch("TRUNCATION 5");

  //   // Test email after truncation
  //   await emailClient.sendMail({
  //     from: "publisher@example.com",
  //     to: `${feedReference}@${emailHostname}`,
  //     subject: "Test email after truncation",
  //     text: "A link: https://kill-the-newsletter.com",
  //   });
  //   expect((await webClient.get(`feeds/${feedReference}.xml`)).body).toMatch(
  //     // prettier-ignore
  //     html`<title>Test email after truncation</title>`
  //   );

  //   // Stop servers
  //   webServer.close();
  //   emailServer.close();
  // });

  assert.equal(1 + 1, 2);

  process.exit(0);
}

const version = JSON.parse(
  await fs.readFile(new URL("../../package.json", import.meta.url), "utf8")
).version;

await commander.program
  .name("kill-the-newsletter")
  .description("Convert email newsletters into Atom feeds")
  .addOption(
    new commander.Option("--process-type <process-type>")
      .default("main")
      .hideHelp()
  )
  .addOption(
    new commander.Option("--process-number <process-number>").hideHelp()
  )
  .argument(
    "[configuration]",
    "Path to configuration file. If you don’t provide a configuration file, the application runs in demonstration mode.",
    url.fileURLToPath(
      new URL("../../configuration/default.mjs", import.meta.url)
    )
  )
  .version(version)
  .addHelpText(
    "after",
    "\n" +
      dedent`
      Configuration:
        See ‘https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md’ for instructions, and ‘https://github.com/courselore/courselore/blob/main/configuration/example.mjs’ for an example.
    `
  )
  .allowExcessArguments(false)
  .showHelpAfterError()
  .action(
    async (
      configuration: string,
      {
        processType,
        processNumber,
      }: {
        processType: "main" | "web" | "email";
        processNumber: string;
      }
    ) => {
      const stop = new Promise<void>((resolve) => {
        const processKeepAlive = new AbortController();
        timers
          .setInterval(1 << 30, undefined, {
            signal: processKeepAlive.signal,
          })
          [Symbol.asyncIterator]()
          .next()
          .catch(() => {});
        for (const event of [
          "exit",
          "SIGHUP",
          "SIGINT",
          "SIGQUIT",
          "SIGTERM",
          "SIGUSR2",
          "SIGBREAK",
        ])
          process.on(event, () => {
            processKeepAlive.abort();
            resolve();
          });
      });

      const application: {
        name: string;
        version: string;
        process: {
          id: string;
          type: "main" | "web" | "email";
          number: number;
        };
        configuration: {
          hostname: string;
          dataDirectory: string;
          administratorEmail: string;
          environment: "production" | "development" | "other";
          tunnel: boolean;
          alternativeHostnames: string[];
          hstsPreload: boolean;
          caddy: string;
        };
        static: {
          [path: string]: string;
        };
        ports: {
          web: number[];
        };
        web: Omit<express.Express, "locals"> & Function;
        email: "TODO";
        log(...messageParts: string[]): void;
        database: Database;
      } = {
        name: "kill-the-newsletter",
        version,
        process: {
          id: Math.random().toString(36).slice(2),
          type: processType,
          number: (typeof processNumber === "string"
            ? Number(processNumber)
            : undefined) as number,
        },
        configuration: (await import(url.pathToFileURL(configuration).href))
          .default,
        static: JSON.parse(
          await fs.readFile(
            new URL("../static/paths.json", import.meta.url),
            "utf8"
          )
        ),
        ports: {
          web: lodash.times(
            os.cpus().length,
            (processNumber) => 6000 + processNumber
          ),
        },
        web: express(),
        email: "TODO",
      } as any;

      application.configuration.environment ??= "production";
      application.configuration.tunnel ??= false;
      application.configuration.alternativeHostnames ??= [];
      application.configuration.hstsPreload ??= false;
      application.configuration.caddy ??= caddyfile``;

      application.log = (...messageParts) => {
        console.log(
          [
            new Date().toISOString(),
            application.process.type,
            application.process.number,
            application.process.id,
            ...messageParts,
          ].join(" \t")
        );
      };

      application.log(
        "STARTED",
        ...(application.process.type === "main"
          ? [
              application.name,
              application.version,
              `https://${application.configuration.hostname}`,
            ]
          : [])
      );

      process.once("exit", () => {
        application.log("STOPPED");
      });

      type ResponseLocalsLogging = {
        log(...messageParts: string[]): void;
      };

      application.web.enable("trust proxy");

      application.web.use<{}, any, {}, {}, ResponseLocalsLogging>(
        (request, response, next) => {
          if (response.locals.log !== undefined) return next();

          const id = Math.random().toString(36).slice(2);
          const time = process.hrtime.bigint();
          response.locals.log = (...messageParts) => {
            application.log(
              id,
              `${(process.hrtime.bigint() - time) / 1_000_000n}ms`,
              request.ip,
              request.method,
              request.originalUrl,
              ...messageParts
            );
          };
          const log = response.locals.log;

          log("STARTING...");

          response.once("close", () => {
            const contentLength = response.getHeader("Content-Length");
            log(
              "FINISHED",
              String(response.statusCode),
              ...(typeof contentLength === "string"
                ? [`${Math.ceil(Number(contentLength) / 1000)}kB`]
                : [])
            );
          });

          next();
        }
      );

      await fs.mkdir(application.configuration.dataDirectory, {
        recursive: true,
      });
      application.database = new Database(
        path.join(
          application.configuration.dataDirectory,
          `${application.name}.db`
        )
      );

      process.once("exit", () => {
        application.database.close();
      });

      if (application.process.type === "main") {
        application.log("DATABASE MIGRATION", "STARTING...");

        application.database.pragma("journal_mode = WAL");

        // TODO: STOP USING DEFAULT VALUES.
        // TODO: DOUBLE-CHECK THAT THE OLD MIGRATION SYSTEM IS COMPATIBLE WITH THIS, USING SQLITE’S ‘PRAGMA USER_DATA’
        await application.database.migrate(
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
          `
        );

        application.log("DATABASE MIGRATION", "FINISHED");
      }

      type ResponseLocalsBase = ResponseLocalsLogging & {
        css: ReturnType<typeof localCSS>;
        javascript: ReturnType<typeof localJavaScript>;
      };

      application.web.use<{}, any, {}, {}, ResponseLocalsBase>(
        (request, response, next) => {
          response.locals.css = localCSS();
          response.locals.javascript = localJavaScript();

          if (
            !["GET", "HEAD", "OPTIONS", "TRACE"].includes(request.method) &&
            request.header("CSRF-Protection") !== "true"
          )
            next("Cross-Site Request Forgery");

          next();
        }
      );

      application.web.use<{}, any, {}, {}, ResponseLocalsBase>(
        express.urlencoded({ extended: true })
      );

      const layout = ({
        request,
        response,
        head,
        body,
      }: {
        request: express.Request<{}, HTML, {}, {}, ResponseLocalsBase>;
        response: express.Response<HTML, ResponseLocalsBase>;
        head: HTML;
        body: HTML;
      }) => {
        const layoutBody = html`
          <body
            css="${response.locals.css(css`
              font-family: "JetBrains MonoVariable",
                var(--font-family--monospace);
              font-size: var(--font-size--xs);
              background-color: var(--color--cyan--50);
              color: var(--color--cyan--900);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--cyan--900);
                color: var(--color--cyan--50);
              }
              position: absolute;
              top: 0;
              right: 0;
              bottom: 0;
              left: 0;
            `)}"
          >
            <div
              css="${response.locals.css(css`
                min-height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
              `)}"
            >
              <div
                css="${response.locals.css(css`
                  text-align: center;
                  max-width: var(--width--prose);
                  margin: var(--space--4) var(--space--2);
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                  align-items: center;
                `)}"
              >
                <h1>
                  <a href="https://${application.configuration.hostname}/"
                    >Kill the Newsletter!</a
                  >
                </h1>
                $${body}
              </div>
            </div>
          </body>
        `;

        return html`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta name="version" content="${application.version}" />

              <meta
                name="description"
                content="Convert email newsletters into Atom feeds"
              />

              <meta
                name="viewport"
                content="width=device-width, initial-scale=1, maximum-scale=1"
              />
              <link
                rel="stylesheet"
                href="https://${application.configuration
                  .hostname}/${application.static["index.css"]}"
              />
              $${response.locals.css.toString()}

              <script
                src="https://${application.configuration.hostname}/${application
                  .static["index.mjs"]}"
                defer
              ></script>

              $${head}
            </head>

            $${layoutBody} $${response.locals.javascript.toString()}
          </html>
        `;
      };

      application.web.get<{}, any, {}, {}, ResponseLocalsBase>(
        "/",
        (request, response) => {
          response.send(
            layout({
              request,
              response,
              head: html`<title>Kill the Newsletter!</title>`,
              body: html`
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Aenean dictum dui quis magna mollis, vel interdum felis
                  consectetur.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Aenean dictum dui quis magna mollis, vel interdum felis
                  consectetur.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Aenean dictum dui quis magna mollis, vel interdum felis
                  consectetur.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Aenean dictum dui quis magna mollis, vel interdum felis
                  consectetur.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Aenean dictum dui quis magna mollis, vel interdum felis
                  consectetur.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Aenean dictum dui quis magna mollis, vel interdum felis
                  consectetur.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Aenean dictum dui quis magna mollis, vel interdum felis
                  consectetur.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Aenean dictum dui quis magna mollis, vel interdum felis
                  consectetur.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Aenean dictum dui quis magna mollis, vel interdum felis
                  consectetur.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Aenean dictum dui quis magna mollis, vel interdum felis
                  consectetur.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Aenean dictum dui quis magna mollis, vel interdum felis
                  consectetur.
                </p>
              `,
            })
          );
        }
      );

      // #!/usr/bin/env node

      // import path from "path";
      // import express from "express";
      // import { SMTPServer } from "smtp-server";
      // import mailparser from "mailparser";
      // import fs from "fs-extra";
      // import cryptoRandomString from "crypto-random-string";
      // import { html, HTML } from "@leafac/html";
      // import { css, process as processCSS } from "@leafac/css";
      // import javascript from "tagged-template-noop";
      // import { sql, Database } from "@leafac/sqlite";
      // import databaseMigrate from "@leafac/sqlite-migration";

      // const VERSION = require("../package.json").version;

      // export default function killTheNewsletter(
      //   rootDirectory: string
      // ): { webApplication: express.Express; emailApplication: SMTPServer } {
      //   const webApplication = express();

      //   webApplication.set("url", "http://localhost:4000");
      //   webApplication.set("email", "smtp://localhost:2525");
      //   webApplication.set("administrator", "mailto:kill-the-newsletter@leafac.com");

      //   fs.ensureDirSync(rootDirectory);
      //   const database = new Database(
      //     path.join(rootDirectory, "kill-the-newsletter.db")
      //   );
      //   databaseMigrate(database, [
      //   ]);

      //   webApplication.use(express.static(path.join(__dirname, "../public")));
      //   webApplication.use(express.urlencoded({ extended: true }));

      //   const logo = fs.readFileSync(path.join(__dirname, "../public/logo.svg"));

      //   function layout(body: HTML): HTML {
      //     return processCSS(html`
      //       <!DOCTYPE html>
      //       <html lang="en">
      //         <head>
      //           <meta charset="UTF-8" />
      //           <meta
      //             name="viewport"
      //             content="width=device-width, initial-scale=1.0"
      //           />
      //           <meta name="generator" content="Kill the Newsletter!/${VERSION}" />
      //           <meta
      //             name="description"
      //             content="Convert email newsletters into Atom feeds."
      //           />
      //           <title>Kill the Newsletter!</title>
      //         </head>
      //         <body
      //           style="${css`
      //             @at-root {
      //               body {
      //                 font-size: 0.875rem;
      //                 -webkit-text-size-adjust: 100%;
      //                 line-height: 1.5;
      //                 font-family: --apple-system, BlinkMacSystemFont, "Segoe UI",
      //                   Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans",
      //                   "Helvetica Neue", sans-serif;
      //                 max-width: 450px;
      //                 padding: 0 1rem;
      //                 margin: 1rem auto;
      //                 text-align: center;
      //                 overflow-wrap: break-word;

      //                 @media (prefers-color-scheme: dark) {
      //                   color: #d4d4d4;
      //                   background-color: #1e1e1e;
      //                 }
      //               }

      //               code {
      //                 font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo,
      //                   monospace;
      //               }

      //               h1 {
      //                 font-size: 1.3rem;
      //               }

      //               footer {
      //                 font-size: 0.75rem;
      //               }

      //               a {
      //                 color: inherit;
      //                 transition: color 0.2s;

      //                 &:hover {
      //                   color: #29adff;
      //                 }

      //                 h1 &,
      //                 footer & {
      //                   text-decoration: none;
      //                 }
      //               }

      //               input,
      //               button {
      //                 all: unset;
      //                 padding: 0.1rem 1rem;
      //                 border: 1px solid gainsboro;
      //                 border-radius: 5px;
      //                 box-shadow: inset 0 1px 1px #ffffff10, 0 1px 3px #00000010;
      //                 transition: border-color 0.2s;

      //                 @media (prefers-color-scheme: dark) {
      //                   border-color: dimgray;
      //                 }

      //                 @supports (-webkit-touch-callout: none) {
      //                   font-size: 16px;
      //                 }

      //                 &:focus {
      //                   border-color: #29adff;
      //                 }
      //               }

      //               button {
      //                 background-color: white;

      //                 @media (prefers-color-scheme: dark) {
      //                   background-color: #5a5a5a;
      //                 }

      //                 &:active {
      //                   color: white;
      //                   background-color: #29adff;
      //                 }
      //               }
      //             }
      //           `}"
      //         >
      //           <header>
      //             <h1>
      //               <a href="${webApplication.get("url")}/">Kill the Newsletter!</a>
      //             </h1>
      //             <p>Convert email newsletters into Atom feeds</p>
      //             <p
      //               style="${css`
      //                 @media (prefers-color-scheme: dark) {
      //                   path {
      //                     fill: #d4d4d4;
      //                   }
      //                 }
      //               `}"
      //             >
      //               $${logo}
      //             </p>
      //           </header>
      //           <main>$${body}</main>
      //           <footer>
      //             <p>
      //               By <a href="https://leafac.com">Leandro Facchinetti</a> ·
      //               <a href="https://patreon.com/leafac">Patreon</a> ·
      //               <a href="https://paypal.me/LeandroFacchinetti">PayPal</a> ·
      //               <a href="https://github.com/leafac/kill-the-newsletter.com"
      //                 >Source</a
      //               > ·
      //               <a href="${webApplication.get("administrator")}"
      //                 >Report an issue</a
      //               >
      //             </p>
      //           </footer>
      //           <script>
      //             for (const copyable of document.querySelectorAll(".copyable"))
      //               copyable.insertAdjacentHTML(
      //                 "afterend",
      //                 $${"`"}$${html`<br />
      //                   <button
      //                     type="button"
      //                     onclick="${javascript`
      //                       (async () => {
      //                         await navigator.clipboard.writeText("\${copyable.textContent}");
      //                         const originalTextContent = this.textContent;
      //                         this.textContent = "Copied";
      //                         await new Promise(resolve => window.setTimeout(resolve, 500));
      //                         this.textContent = originalTextContent;
      //                       })();
      //                     `}"
      //                   >
      //                     Copy
      //                   </button>`}$${"`"}
      //               );
      //           </script>
      //         </body>
      //       </html>
      //     `);
      //   }

      //   webApplication.get<{}, HTML, {}, {}, {}>("/", (req, res) => {
      //     res.send(
      //       layout(html`
      //         <form
      //           method="POST"
      //           action="${webApplication.get("url")}"
      //           style="${css`
      //             max-width: 300px;
      //             margin: 0 auto;

      //             input,
      //             button {
      //               box-sizing: border-box;
      //               width: 100%;
      //             }
      //           `}"
      //         >
      //           <p>
      //             <input
      //               type="text"
      //               name="name"
      //               placeholder="Newsletter name…"
      //               maxlength="500"
      //               required
      //               pattern=".*\\S.*"
      //               autocomplete="off"
      //               autofocus
      //             />
      //           </p>
      //           <p>
      //             <button>Create Inbox</button>
      //           </p>
      //         </form>
      //       `)
      //     );
      //   });

      //   webApplication.post<{}, HTML, { name?: string }, {}, {}>("/", (req, res) => {
      //     if (
      //       typeof req.body.name !== "string" ||
      //       req.body.name.trim() === "" ||
      //       req.body.name.length > 500
      //     )
      //       return res.status(422).send(
      //         layout(
      //           html`
      //             <p>
      //               Error: Missing newsletter name.
      //               <a href="${webApplication.get("url")}/"
      //                 ><strong>Try again</strong></a
      //               >.
      //             </p>
      //           `
      //         )
      //       );

      //     const feedReference = newReference();
      //     const welcomeTitle = `“${req.body.name}” inbox created`;
      //     const welcomeContent = html`
      //       <p>
      //         Sign up for the newsletter with<br />
      //         <code class="copyable"
      //           >${feedReference}@${new URL(webApplication.get("email"))
      //             .hostname}</code
      //         >
      //       </p>
      //       <p>
      //         Subscribe to the Atom feed at<br />
      //         <code class="copyable"
      //           >${webApplication.get("url")}/feeds/${feedReference}.xml</code
      //         >
      //       </p>
      //       <p>
      //         <strong>Don’t share these addresses.</strong><br />
      //         They contain an identifier that other people could use to send you spam
      //         and to control your newsletter subscriptions.
      //       </p>
      //       <p><strong>Enjoy your readings!</strong></p>
      //       <p>
      //         <a href="${webApplication.get("url")}/"
      //           ><strong>Create another inbox</strong></a
      //         >
      //       </p>
      //     `;

      //     database.executeTransaction(() => {
      //       const feedId = database.run(
      //         sql`INSERT INTO "feeds" ("reference", "title") VALUES (${feedReference}, ${req.body.name})`
      //       ).lastInsertRowid;
      //       database.run(
      //         sql`
      //           INSERT INTO "entries" ("reference", "feed", "title", "author", "content")
      //           VALUES (
      //             ${newReference()},
      //             ${feedId},
      //             ${welcomeTitle},
      //             ${"Kill the Newsletter!"},
      //             ${welcomeContent}
      //           )
      //       `
      //       );
      //     });

      //     res.send(
      //       layout(html`
      //         <p><strong>${welcomeTitle}</strong></p>
      //         $${welcomeContent}
      //       `)
      //     );
      //   });

      //   function renderFeed(feedReference: string): HTML | undefined {
      //     const feed = database.get<{
      //       id: number;
      //       updatedAt: string;
      //       title: string;
      //     }>(
      //       sql`SELECT "id", "updatedAt", "title" FROM "feeds" WHERE "reference" = ${feedReference}`
      //     );
      //     if (feed === undefined) return;

      //     const entries = database.all<{
      //       createdAt: string;
      //       reference: string;
      //       title: string;
      //       author: string;
      //       content: string;
      //     }>(
      //       sql`
      //         SELECT "createdAt", "reference", "title", "author", "content"
      //         FROM "entries"
      //         WHERE "feed" = ${feed.id}
      //         ORDER BY "id" DESC
      //       `
      //     );

      //     return html`
      //       <?xml version="1.0" encoding="utf-8"?>
      //       <feed xmlns="http://www.w3.org/2005/Atom">
      //         <link
      //           rel="self"
      //           type="application/atom+xml"
      //           href="${webApplication.get("url")}/feeds/${feedReference}.xml"
      //         />
      //         <link
      //           rel="alternate"
      //           type="text/html"
      //           href="${webApplication.get("url")}/"
      //         />
      //         <id>urn:kill-the-newsletter:${feedReference}</id>
      //         <title>${feed.title}</title>
      //         <subtitle
      //           >Kill the Newsletter! Inbox:
      //           ${feedReference}@${new URL(webApplication.get("email")).hostname} →
      //           ${webApplication.get("url")}/feeds/${feedReference}.xml</subtitle
      //         >
      //         <updated>${new Date(feed.updatedAt).toISOString()}</updated>
      //         <author><name>Kill the Newsletter!</name></author>
      //         $${entries.map(
      //           (entry) => html`
      //             <entry>
      //               <id>urn:kill-the-newsletter:${entry.reference}</id>
      //               <title>${entry.title}</title>
      //               <author><name>${entry.author}</name></author>
      //               <updated>${new Date(entry.createdAt).toISOString()}</updated>
      //               <link
      //                 rel="alternate"
      //                 type="text/html"
      //                 href="${webApplication.get(
      //                   "url"
      //                 )}/alternates/${entry.reference}.html"
      //               />
      //               <content type="html">${entry.content}</content>
      //             </entry>
      //           `
      //         )}
      //       </feed>
      //     `.trim();
      //   }

      //   webApplication.get<{ feedReference: string }, HTML, {}, {}, {}>(
      //     "/feeds/:feedReference.xml",
      //     (req, res, next) => {
      //       const feed = renderFeed(req.params.feedReference);
      //       if (feed === undefined) return next();
      //       res.type("atom").header("X-Robots-Tag", "noindex").send(feed);
      //     }
      //   );

      //   webApplication.get<{ entryReference: string }, HTML, {}, {}, {}>(
      //     "/alternates/:entryReference.html",
      //     (req, res, next) => {
      //       const entry = database.get<{ content: string }>(
      //         sql`SELECT "content" FROM "entries" WHERE "reference" = ${req.params.entryReference}`
      //       );
      //       if (entry === undefined) return next();
      //       res.header("X-Robots-Tag", "noindex").send(entry.content);
      //     }
      //   );

      //   webApplication.use((req, res) => {
      //     res.send(
      //       layout(html`
      //         <p><strong>404 Not found</strong></p>
      //         <p>
      //           <a href="${webApplication.get("url")}/"
      //             ><strong>Create a new inbox</strong></a
      //           >
      //         </p>
      //       `)
      //     );
      //   });

      //   const emailApplication = new SMTPServer({
      //     disabledCommands: ["AUTH", "STARTTLS"],
      //     async onData(stream, session, callback) {
      //       try {
      //         const email = await mailparser.simpleParser(stream);
      //         const from = email.from?.text ?? "";
      //         const subject = email.subject ?? "";
      //         const body =
      //           typeof email.html === "string" ? email.html : email.textAsHtml ?? "";
      //         database.executeTransaction(() => {
      //           for (const address of new Set(
      //             session.envelope.rcptTo.map(
      //               (smtpServerAddress) => smtpServerAddress.address
      //             )
      //           )) {
      //             const addressParts = address.split("@");
      //             if (addressParts.length !== 2) continue;
      //             const [feedReference, hostname] = addressParts;
      //             if (hostname !== new URL(webApplication.get("email")).hostname)
      //               continue;
      //             const feed = database.get<{ id: number }>(
      //               sql`SELECT "id" FROM "feeds" WHERE "reference" = ${feedReference}`
      //             );
      //             if (feed === undefined) continue;
      //             database.run(
      //               sql`
      //                 INSERT INTO "entries" ("reference", "feed", "title", "author", "content")
      //                 VALUES (
      //                   ${newReference()},
      //                   ${feed.id},
      //                   ${subject},
      //                   ${from},
      //                   ${body}
      //                 )
      //               `
      //             );
      //             database.run(
      //               sql`UPDATE "feeds" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${feed.id}`
      //             );
      //             while (renderFeed(feedReference)!.length > 500_000)
      //               database.run(
      //                 sql`DELETE FROM "entries" WHERE "feed" = ${feed.id} ORDER BY "id" ASC LIMIT 1`
      //               );
      //           }
      //         });
      //         callback();
      //       } catch (error) {
      //         console.error(
      //           `Failed to receive message: ‘${JSON.stringify(session, null, 2)}’`
      //         );
      //         console.error(error);
      //         stream.resume();
      //         callback(new Error("Failed to receive message. Please try again."));
      //       }
      //     },
      //   });

      //   function newReference(): string {
      //     return cryptoRandomString({
      //       length: 16,
      //       characters: "abcdefghijklmnopqrstuvwxyz0123456789",
      //     });
      //   }

      //   return { webApplication, emailApplication };
      // }

      // if (require.main === module) {
      //   console.log(`Kill the Newsletter!/${VERSION}`);
      //   if (process.argv[2] === undefined) {
      //     const { webApplication, emailApplication } = killTheNewsletter(
      //       path.join(process.cwd(), "data")
      //     );
      //     webApplication.listen(new URL(webApplication.get("url")).port, () => {
      //       console.log(`Web server started at ${webApplication.get("url")}`);
      //     });
      //     emailApplication.listen(new URL(webApplication.get("email")).port, () => {
      //       console.log(`Email server started at ${webApplication.get("email")}`);
      //     });
      //   } else {
      //     const configurationFile = path.resolve(process.argv[2]);
      //     require(configurationFile)(require);
      //     console.log(`Configuration loaded from ‘${configurationFile}’.`);
      //   }
      // }

      switch (application.process.type) {
        case "main": {
          const childProcesses = new Set<ExecaChildProcess>();
          let restartChildProcesses = true;
          for (const execaArguments of [
            ...Object.entries({ web: os.cpus().length, email: 1 }).flatMap(
              ([processType, processCount]) =>
                lodash.times(processCount, (processNumber) => ({
                  file: process.argv[0],
                  arguments: [
                    process.argv[1],
                    "--process-type",
                    processType,
                    "--process-number",
                    processNumber,
                    configuration,
                  ],
                  options: {
                    preferLocal: true,
                    stdio: "inherit",
                    ...(application.configuration.environment === "production"
                      ? { env: { NODE_ENV: "production" } }
                      : {}),
                  },
                }))
            ),
            {
              file: "caddy",
              arguments: ["run", "--config", "-", "--adapter", "caddyfile"],
              options: {
                preferLocal: true,
                stdout: "ignore",
                stderr: "ignore",
                input: caddyfile`
                  {
                    admin off
                    ${
                      application.configuration.environment === "production"
                        ? `email ${application.configuration.administratorEmail}`
                        : `local_certs`
                    }
                  }

                  (common) {
                    header Cache-Control no-store
                    header Content-Security-Policy "default-src https://${
                      application.configuration.hostname
                    }/ 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; object-src 'none'"
                    header Cross-Origin-Embedder-Policy require-corp
                    header Cross-Origin-Opener-Policy same-origin
                    header Cross-Origin-Resource-Policy same-origin
                    header Referrer-Policy no-referrer
                    header Strict-Transport-Security "max-age=31536000; includeSubDomains${
                      application.configuration.hstsPreload ? `; preload` : ``
                    }"
                    header X-Content-Type-Options nosniff
                    header Origin-Agent-Cluster "?1"
                    header X-DNS-Prefetch-Control off
                    header X-Frame-Options DENY
                    header X-Permitted-Cross-Domain-Policies none
                    header -Server
                    header -X-Powered-By
                    header X-XSS-Protection 0
                    header Permissions-Policy "interest-cohort=()"
                    encode zstd gzip
                  }

                  ${[
                    ...(application.configuration.tunnel
                      ? []
                      : [application.configuration.hostname]),
                    ...application.configuration.alternativeHostnames,
                  ]
                    .map((hostname) => `http://${hostname}`)
                    .join(", ")} {
                    import common
                    redir https://{host}{uri} 308
                    handle_errors {
                      import common
                    }
                  }

                  ${
                    application.configuration.alternativeHostnames.length > 0
                      ? caddyfile`
                          ${application.configuration.alternativeHostnames
                            .map((hostname) => `https://${hostname}`)
                            .join(", ")} {
                            import common
                            redir https://${
                              application.configuration.hostname
                            }{uri} 307
                            handle_errors {
                              import common
                            }
                          }
                        `
                      : ``
                  }

                  http${application.configuration.tunnel ? `` : `s`}://${
                  application.configuration.hostname
                } {
                    route {
                      import common
                      route {
                        root * ${JSON.stringify(
                          url.fileURLToPath(
                            new URL("../static/", import.meta.url)
                          )
                        )}
                        @file_exists file
                        route @file_exists {
                          header Cache-Control "public, max-age=31536000, immutable"
                          file_server
                        }
                      }
                      reverse_proxy ${application.ports.web
                        .map((port) => `127.0.0.1:${port}`)
                        .join(" ")} {
                          lb_retries 1
                        }
                    }
                    handle_errors {
                      import common
                    }
                  }

                  ${application.configuration.caddy}
                `,
              },
            },
          ])
            (async () => {
              while (restartChildProcesses) {
                const childProcess = execa(
                  execaArguments.file,
                  execaArguments.arguments as any,
                  {
                    ...execaArguments.options,
                    reject: false,
                    cleanup: false,
                  } as any
                );
                childProcesses.add(childProcess);
                const childProcessResult = await childProcess;
                application.log(
                  "CHILD PROCESS RESULT",
                  JSON.stringify(childProcessResult, undefined, 2)
                );
                childProcesses.delete(childProcess);
              }
            })();
          await stop;
          restartChildProcesses = false;
          for (const childProcess of childProcesses) childProcess.cancel();
          break;
        }

        case "web": {
          const webApplication = application.web;
          webApplication.emit("start");
          const server = webApplication.listen(
            application.ports.web[application.process.number],
            "127.0.0.1"
          );
          await stop;
          server.close();
          webApplication.emit("stop");
          break;
        }

        case "email": {
          // TODO
          await stop;
          break;
        }
      }

      await timers.setTimeout(10 * 1000, undefined, { ref: false });
      process.exit(1);
    }
  )
  .parseAsync();
