import path from "node:path";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "localhost",
  port: 25,
  secure: false,
  tls: { rejectUnauthorized: false },
});

// Base case
await transporter.sendMail({
  from: `"Example of Sender" <sender@example.com>`,
  to: `"Example of Recipient" <r5bsqg3w6gqrsv7m59f1@localhost>`,
  subject: "Example of a Newsletter Entry",
  html: "<p>Hello <strong>World</strong></p>".repeat(2 ** 0 /* 13 */),
  attachments: [
    { path: path.join(import.meta.dirname, "../static/favicon.ico") },
  ],
});

// Param: showsender (has display name)
await transporter.sendMail({
  from: `"Example of Sender" <sender@example.com>`,
  to: `"Example of Recipient" <r5bsqg3w6gqrsv7m59f1+showsender@localhost>`,
  subject: "Example of a Newsletter Entry",
  html: "<p>Hello <strong>World</strong></p>".repeat(2 ** 0 /* 13 */),
  attachments: [
    { path: path.join(import.meta.dirname, "../static/favicon.ico") },
  ],
});

// Param: showsender (addr-spec only)
await transporter.sendMail({
  from: `sender@example.com`,
  to: `"Example of Recipient" <r5bsqg3w6gqrsv7m59f1+showsender@localhost>`,
  subject: "Example of a Newsletter Entry",
  html: "<p>Hello <strong>World</strong></p>".repeat(2 ** 0 /* 13 */),
  attachments: [
    { path: path.join(import.meta.dirname, "../static/favicon.ico") },
  ],
});

// Param: <undefined>
await transporter.sendMail({
  from: `sender@example.com`,
  to: `"Example of Recipient" <r5bsqg3w6gqrsv7m59f1+NotARealParam@localhost>`,
  subject: "Example of a Newsletter Entry",
  html: "<p>Hello <strong>World</strong></p>".repeat(2 ** 0 /* 13 */),
  attachments: [
    { path: path.join(import.meta.dirname, "../static/favicon.ico") },
  ],
});
