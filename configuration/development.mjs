import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

export default {
  hostname: "localhost",
  administratorEmail: "kill-the-newsletter@example.com",
  tls: {
    key: await fs.readFile(
      path.join(
        os.homedir(),
        "Library/Application Support/Caddy/certificates/local/localhost/localhost.key",
      ),
      "utf-8",
    ),
    certificate: await fs.readFile(
      path.join(
        os.homedir(),
        "Library/Application Support/Caddy/certificates/local/localhost/localhost.crt",
      ),
      "utf-8",
    ),
  },
  environment: "development",
};
