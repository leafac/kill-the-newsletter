import nodemailer from "nodemailer";

await nodemailer
  .createTransport({
    host: "localhost",
    port: 25,
  })
  .sendMail({
    from: `"Example of Sender" <sender@example.com>`,
    to: `"Example of Recipient" <bx99z1gte1486ss96jpj@localhost>`,
    subject: "Example of a Newsletter Entry",
    html: "<p>Hello World</p>",
  });
