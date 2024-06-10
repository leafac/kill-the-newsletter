import os from "node:os";
import path from "node:path";
import * as caddy from "@radically-straightforward/caddy";

export default {
  hostname: process.env.TUNNEL ?? os.hostname(),
  tls: {
    key: path.join(
      caddy.dataDirectory(),
      "certificates/local/localhost/localhost.key",
    ),
    certificate: path.join(
      caddy.dataDirectory(),
      "certificates/local/localhost/localhost.crt",
    ),
  },
  environment: "development",
  tunnel: typeof process.env.TUNNEL === "string",
};
