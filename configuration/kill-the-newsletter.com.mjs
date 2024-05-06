import path from "node:path";
import * as caddy from "@radically-straightforward/caddy";

export default {
  hostname: "kill-the-newsletter.com",
  administratorEmail: "kill-the-newsletter@leafac.com",
  tls: {
    key: path.join(
      caddy.dataDirectory(),
      "certificates/acme-v02.api.letsencrypt.org-directory/kill-the-newsletter.com/kill-the-newsletter.com.key",
    ),
    certificate: path.join(
      caddy.dataDirectory(),
      "certificates/acme-v02.api.letsencrypt.org-directory/kill-the-newsletter.com/kill-the-newsletter.com.crt",
    ),
  },
  hstsPreload: true,
  extraCaddyfile: `
    www.kill-the-newsletter.com {
      redir https://kill-the-newsletter.com{uri} 
    }
  `
};
