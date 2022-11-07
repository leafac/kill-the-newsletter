// COURSELORE CONFIGURATION

import url from "node:url";

export default {
  // The main hostname through which people may access Courselore.
  hostname: "YOUR-DOMAIN.EDU",

  // The path to the folder in which Courselore stores data:
  // the database and the files uploaded by users (for example, user avatars and attachments in messages).
  // With the line below this is a folder called ‘data/’ relative to this configuration file.
  // In most cases this is appropriate, but you may want to change it to an absolute path, for example, ‘/home/courselore/data/’.
  dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),

  // Configuration for the email server that delivers email on Courselore’s behalf.
  // Use the format of arguments accepted by Nodemailer’s ‘.createTransport()’. See https://nodemailer.com/smtp/.
  email: {
    options: {
      host: "SMTP.YOUR-DOMAIN.EDU",
      auth: {
        user: "SMTP USERNAME",
        pass: "SMTP PASSWORD",
      },
    },
    defaults: {
      from: {
        name: "Courselore",
        address: "FROM@YOUR-DOMAIN.EDU",
      },
    },
  },

  // This email address serves two purposes:
  // 1. If something goes wrong in Courselore, we direct users to report the issue to this email.
  // 2. We provide this email to the certificate authority providing a TLS certificate (necessary for httpS to work).
  //    In case something goes wrong with the certificate, they’ll contact you at this address.
  administratorEmail: "ADMINISTRATOR@YOUR-DOMAIN.EDU",

  // [OPTIONAL] Other hostnames you’d like to redirect to this Courselore installation.
  // alternativeHostnames: ["WWW.YOUR-DOMAIN.EDU", "..."],

  // [OPTIONAL, BUT RECOMMENDED] See https://hstspreload.org/.
  // hstsPreload: true,

  // [OPTIONAL] Extra Caddy configuration to add to Courselore’s Caddy configuration. See https://caddyserver.com.
  // caddy: ``,
};
