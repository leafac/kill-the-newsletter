import nodemailer from "nodemailer";

await nodemailer
  .createTransport({
    host: "localhost",
    port: 25,
  })
  .sendMail({
    from: `"Example of Sender" <sender@example.com>`,
    to: `"Example of Recipient" <qni66g9alnwozwsrbrgw@localhost>`,
    subject: "Example of a Newsletter Entry",
    html: "<p>Hello <strong>World</strong></p>".repeat(2 ** 0 /*13*/),
  });
