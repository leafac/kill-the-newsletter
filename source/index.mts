import util from "node:util";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import server from "@radically-straightforward/server";
import * as serverTypes from "@radically-straightforward/server";
import sql, { Database } from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";
import * as caddy from "@radically-straightforward/caddy";

const commandLineArguments = util.parseArgs({
  options: {
    type: { type: "string" },
    port: { type: "string" },
  },
  allowPositionals: true,
});

const configuration: {
  hostname: string;
  administratorEmail: string;
  dataDirectory: string;
  environment: "production" | "development";
  hstsPreload: boolean;
  ports: number[];
} =
  typeof commandLineArguments.positionals[0] === "string"
    ? (await import(path.resolve(commandLineArguments.positionals[0]))).default
    : {
        hostname: "localhost",
        administratorEmail: "kill-the-newsletter@example.com",
      };
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
      "name" TEXT NOT NULL
    ) STRICT;
    CREATE TABLE "entries" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "inbox" INTEGER NOT NULL REFERENCES "inboxes",
      "title" TEXT NOT NULL,
      "content" TEXT NOT NULL
    );
  `,
);

switch (commandLineArguments.values.type) {
  case undefined:
    utilities.log("KILL-THE-NEWSLETTER", "2.0.0", "START");
    process.once("beforeExit", () => {
      utilities.log("STOP");
    });
    for (const port of configuration.ports)
      node.childProcessKeepAlive(() =>
        childProcess.spawn(
          process.argv[0],
          [
            process.argv[1],
            ...(typeof commandLineArguments.positionals[0] === "string"
              ? [commandLineArguments.positionals[0]]
              : []),
            "--type",
            "web",
            "--port",
            String(port),
          ],
          { stdio: "inherit" },
        ),
      );
    node.childProcessKeepAlive(() =>
      childProcess.spawn(
        process.argv[0],
        [
          process.argv[1],
          ...(typeof commandLineArguments.positionals[0] === "string"
            ? [commandLineArguments.positionals[0]]
            : []),
          "--type",
          "email",
        ],
        { stdio: "inherit" },
      ),
    );
    caddy.start({
      address: configuration.hostname,
      untrustedStaticFilesRoots: [],
      dynamicServerPorts: configuration.ports,
      email: configuration.administratorEmail,
      hstsPreload: configuration.hstsPreload,
    });
    break;

  case "web":
    const application = server({
      port: Number(commandLineArguments.values.port),
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
            javascript="${javascript`
              if (${configuration.environment === "development"})
                javascript.liveConnection(${request.id}, { reload: true });  
            `}"
          >
            $${body}
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
              <form method="POST" action="/" novalidate>
                <input type="text" name="title" required />
                <button>Create Inbox</button>
              </form>
            `,
          }),
        );
      },
    });
    break;

  case "email":
    break;
}
