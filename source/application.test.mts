import path from "node:path";
import nodemailer from "nodemailer";

await nodemailer
  .createTransport({
    host: "localhost",
    port: 25,
  })
  .sendMail({
    from: `"Example of Sender" <sender@example.com>`,
    to: `"Example of Recipient" <r5bsqg3w6gqrsv7m59f1@localhost>`,
    subject: "Example of a Newsletter Entry",
    html: "<p>Hello <strong>World</strong></p>".repeat(2 ** 0 /* 13 */),
    attachments: [
      { path: path.join(import.meta.dirname, "../static/favicon.ico") },
    ],
  });
