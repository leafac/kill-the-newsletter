import path from "node:path";
import childProcess from "node:child_process";
import * as node from "@radically-straightforward/node";
import * as caddy from "@radically-straightforward/caddy";

const applicationJSON = childProcess.spawnSync(
  process.argv[0],
  [
    "--enable-source-maps",
    path.join(import.meta.dirname, "application.mjs"),
    ...process.argv.slice(2),
    "--type",
    "initialize",
  ],
  {
    stdio: ["inherit", "inherit", "inherit", "pipe"],
    encoding: "utf-8",
  },
).output[3];
if (typeof applicationJSON !== "string" || applicationJSON.trim() === "")
  process.exit();
const application = JSON.parse(applicationJSON);

for (const port of application.applicationConfiguration.ports)
  node.childProcessKeepAlive(() =>
    childProcess.spawn(
      process.argv[0],
      [
        "--enable-source-maps",
        path.join(import.meta.dirname, "application.mjs"),
        ...process.argv.slice(2),
        "--type",
        "webServer",
        "--port",
        String(port),
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: application.userConfiguration.environment,
        },
        stdio: "inherit",
      },
    ),
  );

node.childProcessKeepAlive(() =>
  childProcess.spawn(
    process.argv[0],
    [
      "--enable-source-maps",
      path.join(import.meta.dirname, "application.mjs"),
      ...process.argv.slice(2),
      "--type",
      "backgroundJobWorker",
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: application.userConfiguration.environment,
      },
      stdio: "inherit",
    },
  ),
);

node.childProcessKeepAlive(() =>
  childProcess.spawn(
    process.argv[0],
    [
      "--enable-source-maps",
      path.join(import.meta.dirname, "application.mjs"),
      ...process.argv.slice(2),
      "--type",
      "emailServer",
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: application.userConfiguration.environment,
      },
      stdio: "inherit",
    },
  ),
);

caddy.start({
  ...application.userConfiguration,
  ...application.applicationConfiguration,
  untrustedStaticFilesRoots: [
    `/files/* "${application.userConfiguration.dataDirectory}"`,
  ],
});
