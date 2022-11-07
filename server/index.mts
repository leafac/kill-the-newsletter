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
        processType: "main" | "server" | "worker";
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

      const application = {
        name: "courselore",
        version,
        process: {
          id: Math.random().toString(36).slice(2),
          type: processType,
          number:
            typeof processNumber === "string"
              ? Number(processNumber)
              : undefined,
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
          server: lodash.times(
            os.cpus().length,
            (processNumber) => 6000 + processNumber
          ),
          serverEvents: lodash.times(
            os.cpus().length,
            (processNumber) => 7000 + processNumber
          ),
          workerEvents: lodash.times(
            os.cpus().length,
            (processNumber) => 8000 + processNumber
          ),
        },
        addresses: {
          canonicalHostname: "courselore.org",
          metaCourseloreInvitation: "https://meta.courselore.org",
          tryHostname: "try.courselore.org",
        },
        server: express() as any,
        serverEvents: express() as any,
        workerEvents: express() as any,
      } as Application;

      application.configuration.environment ??= "production";
      application.configuration.demonstration ??=
        application.configuration.environment !== "production";
      application.configuration.tunnel ??= false;
      application.configuration.alternativeHostnames ??= [];
      application.configuration.hstsPreload ??= false;
      application.configuration.caddy ??= caddyfile``;

      // application.server.locals.middleware = {} as any;
      // application.server.locals.helpers = {} as any;

      await logging(application);
      await database(application);
      await healthChecks(application);
      await base(application);
      // await liveUpdates(application);
      // await authentication(application);
      // await layouts(application);
      // await about(application);
      // await administration(application);
      // await user(application);
      // await course(application);
      // await conversation(application);
      // await message(application);
      // await content(application);
      // await email(application);
      // await demonstration(application);
      // await error(application);
      // await helpers(application);

      switch (application.process.type) {
        case "main": {
          const childProcesses = new Set<ExecaChildProcess>();
          let restartChildProcesses = true;
          for (const execaArguments of [
            ...["server", "worker"].flatMap((processType) =>
              lodash.times(os.cpus().length, (processNumber) => ({
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
                  application.configuration.tunnel
                    ? []
                    : [application.configuration.hostname],
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
                    route /files/* {
                      root * ${JSON.stringify(
                        path.resolve(application.configuration.dataDirectory)
                      )}
                      @file_exists file
                      route @file_exists {
                        header Cache-Control "private, max-age=31536000, immutable"
                        @must_be_downloaded not path *.png *.jpg *.jpeg *.gif *.mp3 *.mp4 *.m4v *.ogg *.mov *.mpeg *.avi *.pdf *.txt
                        header @must_be_downloaded Content-Disposition attachment
                        @may_be_embedded_in_other_sites path *.png *.jpg *.jpeg *.gif *.mp3 *.mp4 *.m4v *.ogg *.mov *.mpeg *.avi *.pdf
                        header @may_be_embedded_in_other_sites Cross-Origin-Resource-Policy cross-origin
                        file_server
                      }
                    }
                    reverse_proxy ${application.ports.server
                      .map((port) => `127.0.0.1:${port}`)
                      .join(" ")}
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

        case "server": {
          const serverApplication = application.server;
          const eventsApplication = application.serverEvents;
          serverApplication.emit("start");
          eventsApplication.emit("start");
          const server = serverApplication.listen(
            application.ports.server[application.process.number],
            "127.0.0.1"
          );
          const events = eventsApplication.listen(
            application.ports.serverEvents[application.process.number],
            "127.0.0.1"
          );
          await stop;
          server.close();
          events.close();
          serverApplication.emit("stop");
          eventsApplication.emit("stop");
          break;
        }

        case "worker": {
          const eventsApplication = application.workerEvents;
          eventsApplication.emit("start");
          const events = eventsApplication.listen(
            application.ports.workerEvents[application.process.number],
            "127.0.0.1"
          );
          await stop;
          events.close();
          eventsApplication.emit("stop");
          break;
        }
      }

      await timers.setTimeout(10 * 1000, undefined, { ref: false });
      process.exit(1);
    }
  )
  .parseAsync();
