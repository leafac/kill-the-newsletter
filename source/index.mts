import util from "node:util";
import url from "node:url";
import os from "node:os";
import childProcess from "node:child_process";
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
  environment: "production" | "development";
  hstsPreload: boolean;
  ports: string[];
} =
  typeof commandLineArguments.positionals[0] === "string"
    ? (
        await import(
          url.pathToFileURL(commandLineArguments.positionals[0]).href
        )
      ).default
    : {
        hostname: "localhost",
        administratorEmail: "kill-the-newsletter@example.com",
      };
configuration.environment ??= "production";
configuration.hstsPreload ??= false;
configuration.ports ??= Array.from(
  { length: os.availableParallelism() },
  (value, index) => String(18000 + index),
);

if (commandLineArguments.values.type === undefined) {
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
          port,
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
}
