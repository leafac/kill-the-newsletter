import { developmentWebServer, developmentEmailServer, feedEmail } from ".";
import nodemailer from "nodemailer";
import axios from "axios";
import qs from "qs";

test("create feed", async () => {
  const identifier = await createFeed();

  expect(await readFeed(identifier)).toMatch("My Feed");
});

describe("receive email", () => {
  const transporter = nodemailer.createTransport({
    host: "localhost",
    port: 2525,
    tls: { rejectUnauthorized: false }
  });

  test("HTML content", async () => {
    const identifier = await createFeed();
    await transporter.sendMail({
      from: "publisher@example.com",
      to: feedEmail(identifier),
      subject: "New Message",
      html: "<p>HTML content</p>"
    });
    const feed = await readFeed(identifier);
    expect(feed).toMatch("publisher@example.com");
    expect(feed).toMatch("New Message");
    expect(feed).toMatch("HTML content");
  });

  test("text content", async () => {
    const identifier = await createFeed();
    await transporter.sendMail({
      from: "publisher@example.com",
      to: feedEmail(identifier),
      subject: "New Message",
      text: "TEXT content"
    });
    const feed = await readFeed(identifier);
    expect(feed).toMatch("TEXT content");
  });

  test("truncation", async () => {
    const identifier = await createFeed();
    for (const repetition of [...new Array(4).keys()])
      await transporter.sendMail({
        from: "publisher@example.com",
        to: feedEmail(identifier),
        subject: "New Message",
        text: `REPETITION ${repetition} `.repeat(10_000)
      });
    const feed = await readFeed(identifier);
    expect(feed).toMatch("REPETITION 3");
    expect(feed).not.toMatch("REPETITION 0");
  }, 10_000);
});

afterAll(() => {
  developmentWebServer.close();
  // FIXME: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/43268
  developmentEmailServer.close(() => {});
});

async function createFeed(): Promise<string> {
  return (
    await axios.post(
      "http://localhost:8000",
      qs.stringify({
        name: "My Feed"
      })
    )
  ).data.match(/(\w{20}).xml/)![1];
}

async function readFeed(identifier: string): Promise<string> {
  return (await axios.get(`http://localhost:8000/feeds/${identifier}.xml`))
    .data;
}
