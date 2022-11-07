import url from "node:url";
import fs from "node:fs/promises";

const secrets = JSON.parse(
  await fs.readFile(new URL("./secrets.json", import.meta.url), "utf8")
);

export default {
  hostname: "courselore.org",
  dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),
  email: {
    options: {
      host: "email-smtp.us-east-1.amazonaws.com",
      auth: {
        user: secrets.smtp.username,
        pass: secrets.smtp.password,
      },
    },
    defaults: {
      from: {
        name: "Courselore",
        address: "administrator@courselore.org",
      },
    },
  },
  administratorEmail: "administrator@courselore.org",
  alternativeHostnames: [
    "www.courselore.org",
    "courselore.com",
    "www.courselore.com",
  ],
  hstsPreload: true,
  caddy: `
    http://meta.courselore.org, http://meta.courselore.com {
      import common
      redir https://{host}{uri} 308
      handle_errors {
        import common
      }
    }

    https://meta.courselore.org, https://meta.courselore.com {
      import common
      redir https://courselore.org/courses/8537410611/invitations/3667859788?{query} 307
      handle_errors {
        import common
      }
    }
  `,
};
