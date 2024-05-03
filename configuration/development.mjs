import os from "node:os";
import path from "node:path";

export default {
  hostname: "localhost",
  administratorEmail: "kill-the-newsletter@example.com",
  tls: {
    key: path.join(
      os.homedir(),
      "Library/Application Support/Caddy/certificates/local/localhost/localhost.key",
    ),
    certificate: path.join(
      os.homedir(),
      "Library/Application Support/Caddy/certificates/local/localhost/localhost.crt",
    ),
  },
  environment: "development",
};
