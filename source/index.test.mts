import nodemailer from "nodemailer";

await nodemailer
  .createTransport({
    host: "localhost",
    port: 25,
  })
  .sendMail({
    from: `"Example of Sender" <sender@example.com>`,
    to: `"Example of Recipient" <zk7p2f3m8407rxpb1pq0@localhost>`,
    subject: "Example of a Newsletter Entry",
    html: "<p>Hello World</p>".repeat(1),
  });
