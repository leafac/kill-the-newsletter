import os from "node:os";
import path from "node:path";
import * as caddy from "@radically-straightforward/caddy";

export default {
  hostname: process.env.TUNNEL ?? os.hostname(),
  tls: {
    key: path.join(
      caddy.dataDirectory(),
      `certificates/local/${os.hostname()}/${os.hostname()}.key`,
    ),
    certificate: path.join(
      caddy.dataDirectory(),
      `certificates/local/${os.hostname()}/${os.hostname()}.crt`,
    ),
  },
  environment: "development",
  tunnel: typeof process.env.TUNNEL === "string",
};
