export default {
  hostname: "kill-the-newsletter.com",
  systemAdministratorEmail: "kill-the-newsletter@leafac.com",
  tls: {
    key: "/root/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory/kill-the-newsletter.com/kill-the-newsletter.com.key",
    certificate:
      "/root/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory/kill-the-newsletter.com/kill-the-newsletter.com.crt",
  },
  hstsPreload: true,
  extraCaddyfile: `
    www.kill-the-newsletter.com {
      redir https://kill-the-newsletter.com{uri} 
    }
  `,
};
