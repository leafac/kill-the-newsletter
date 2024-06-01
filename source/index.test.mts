import nodemailer from "nodemailer";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

await nodemailer
  .createTransport({
    host: "localhost",
    port: 25,
  })
  .sendMail({
    from: `"Example of Sender" <sender@example.com>`,
    to: `"Example of Recipient" <r5bsqg3w6gqrsv7m59f1@localhost>`,
    subject: "Example of a Newsletter Entry",
    html: "<p>Hello <strong>World</strong></p>".repeat(2 ** 0),
  });
