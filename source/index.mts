import util from "node:util";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import childProcess from "node:child_process";
import stream from "node:stream/promises";
import crypto from "node:crypto";
import server from "@radically-straightforward/server";
import * as serverTypes from "@radically-straightforward/server";
import sql, { Database } from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";
import caddyfile from "@radically-straightforward/caddy";
import * as caddy from "@radically-straightforward/caddy";
import cryptoRandomString from "crypto-random-string";
import { SMTPServer, SMTPServerAddress } from "smtp-server";
import * as mailParser from "mailparser";

export type Application = {
  types: {
    states: {
      Feed: {
        feed: {
          id: number;
          externalId: string;
          title: string;
          icon: string | null;
        };
      };
    };
  };
  version: string;
  commandLineArguments: {
    values: {
      type: undefined | "server" | "email" | "backgroundJob";
      port: undefined | string;
    };
    positionals: string[];
  };
  configuration: {
    hostname: string;
    systemAdministratorEmail: string;
    tls: { key: string; certificate: string };
    dataDirectory: string;
    environment: "production" | "development";
    hstsPreload: boolean;
    extraCaddyfile: string;
    tunnel: boolean;
    ports: number[];
  };
  database: Database;
  server: undefined | ReturnType<typeof server>;
  layout: (body: HTML) => HTML;
  partials: {
    feed: ({
      feed,
      feedEntries,
    }: {
      feed: {
        externalId: string;
        title: string;
        icon: string | null;
      };
      feedEntries: {
        id: number;
        externalId: string;
        createdAt: string;
        author: string | null;
        title: string;
        content: string;
      }[];
    }) => HTML;
  };
  email: undefined | SMTPServer;
};
const application = {} as Application;
application.version = "2.0.6";
application.commandLineArguments = util.parseArgs({
  options: {
    type: { type: "string" },
    port: { type: "string" },
  },
  allowPositionals: true,
}) as Application["commandLineArguments"];
application.configuration = (
  await import(path.resolve(application.commandLineArguments.positionals[0]))
).default;
application.configuration.dataDirectory ??= path.resolve("./data/");
await fs.mkdir(application.configuration.dataDirectory, { recursive: true });
application.configuration.environment ??= "production";
application.configuration.hstsPreload ??= false;
application.configuration.extraCaddyfile ??= caddyfile``;
application.configuration.ports = Array.from(
  { length: os.availableParallelism() },
  (value, index) => 18000 + index,
);
if (application.commandLineArguments.values.type === "server")
  application.server = server({
    port: Number(application.commandLineArguments.values.port),
    csrfProtectionExceptionPathname: new RegExp(
      "^/feeds/(?<feedExternalId>[A-Za-z0-9]+)/websub$",
    ),
  });
application.partials = {} as any;

utilities.log(
  "KILL THE NEWSLETTER!",
  application.version,
  "START",
  application.commandLineArguments.values.type ??
    `https://${application.configuration.hostname}`,
  application.commandLineArguments.values.port ?? "",
);
process.once("beforeExit", () => {
  utilities.log(
    "KILL THE NEWSLETTER!",
    "STOP",
    application.commandLineArguments.values.type ??
      `https://${application.configuration.hostname}`,
    application.commandLineArguments.values.port ?? "",
  );
});

application.database = await new Database(
  path.join(application.configuration.dataDirectory, "kill-the-newsletter.db"),
).migrate(
  sql`
    CREATE TABLE "feeds" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "reference" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL
    ) STRICT;
    CREATE INDEX "feedsReference" ON "feeds" ("reference");
    CREATE TABLE "entries" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "reference" TEXT NOT NULL UNIQUE,
      "createdAt" TEXT NOT NULL,
      "feed" INTEGER NOT NULL REFERENCES "feeds" ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "content" TEXT NOT NULL
    ) STRICT;
    CREATE INDEX "entriesReference" ON "entries" ("reference");
    CREATE INDEX "entriesFeed" ON "entries" ("feed");
  `,

  (database) => {
    database.execute(
      sql`
        alter table "feeds" rename to "old_feeds";
        alter table "entries" rename to "old_entries";

        create table "feeds" (
          "id" integer primary key autoincrement,
          "externalId" text not null unique,
          "title" text not null
        ) strict;
        create index "feeds_externalId" on "feeds" ("externalId");
        create table "feedEntries" (
          "id" integer primary key autoincrement,
          "externalId" text not null unique,
          "feed" integer not null references "feeds",
          "createdAt" text not null,
          "title" text not null,
          "content" text not null
        ) strict;
        create index "feedEntries_externalId" on "feedEntries" ("externalId");
        create index "feedEntries_feed" on "feedEntries" ("feed");

        insert into "feeds" ("id", "externalId", "title")
        select "id", "reference", "title" from "old_feeds" order by "id" asc;
        insert into "feedEntries" ("id", "externalId", "feed", "createdAt", "title", "content")
        select "id", "reference", "feed", "createdAt", "title", "content" from "old_entries" order by "id" asc;

        drop table "old_feeds";
        drop table "old_entries";
      `,
    );

    if (application.configuration.environment === "development") {
      const feed = database.get<{ id: number }>(
        sql`
          select * from "feeds" where "id" = ${
            database.run(
              sql`
                insert into "feeds" ("externalId", "title")
                values (${"r5bsqg3w6gqrsv7m59f1"}, ${"Example of a feed"});
              `,
            ).lastInsertRowid
          };
        `,
      )!;
      database.run(
        sql`
          insert into "feedEntries" ("externalId", "feed", "createdAt", "title", "content")
          values (
            ${"fjdkqejwpk22"},
            ${feed.id},
            ${new Date().toISOString()},
            ${"Example of a feed entry"},
            ${html`<p>Hello <strong>World</strong> <img src="https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg" /></p>`}
          );
        `,
      );
      database.run(
        sql`
          insert into "feedEntries" ("externalId", "feed", "createdAt", "title", "content")
          values (
            ${"fjrl1k4j234"},
            ${feed.id},
            ${new Date().toISOString()},
            ${"Another example of a feed entry"},
            ${html`<p>Hello <strong>World</strong></p>`}
          );
        `,
      );
    }
  },

  sql`
    create table "feedVisualizations" (
      "id" integer primary key autoincrement,
      "feed" integer not null references "feeds",
      "createdAt" text not null
    ) strict;
    create index "feedVisualizations_feed" on "feedVisualizations" ("feed");
    create index "feedVisualizations_createdAt" on "feedVisualizations" ("createdAt");
  `,

  sql`
    create table "feedWebSubSubscriptions" (
      "id" integer primary key autoincrement,
      "feed" integer not null references "feeds",
      "createdAt" text not null,
      "callback" text not null,
      "secret" text null,
      unique ("feed", "callback")
    ) strict;
    create index "feedWebSubSubscriptions_feed" on "feedWebSubSubscriptions" ("feed");
    create index "feedWebSubSubscriptions_createdAt" on "feedWebSubSubscriptions" ("createdAt");
    create index "feedWebSubSubscriptions_callback" on "feedWebSubSubscriptions" ("callback");
  `,

  sql`
    create table "feedEntryEnclosures" (
      "id" integer primary key autoincrement,
      "externalId" text not null unique,
      "type" text not null,
      "length" integer not null,
      "name" text not null
    ) strict;

    create table "feedEntryEnclosureLinks" (
      "id" integer primary key autoincrement,
      "feedEntry" integer not null references "feedEntries",
      "feedEntryEnclosure" integer not null references "feedEntryEnclosures"
    ) strict;
    create index "feedEntryEnclosureLinks_feedEntry" on "feedEntryEnclosureLinks" ("feedEntry");
    create index "feedEntryEnclosureLinks_feedEntryEnclosure" on "feedEntryEnclosureLinks" ("feedEntryEnclosure");
  `,

  sql`
    alter table "feeds" add column "icon" text null;
    alter table "feedEntries" add column "author" text null;
  `,
);

if (application.commandLineArguments.values.type === "backgroundJob")
  node.backgroundJob({ interval: 60 * 60 * 1000 }, async () => {
    for (const feedEntryEnclosure of application.database.all<{
      id: number;
      externalId: string;
    }>(
      sql`
        select
          "feedEntryEnclosures"."id" as "id",
          "feedEntryEnclosures"."externalId" as "externalId"
        from "feedEntryEnclosures"
        left join "feedEntryEnclosureLinks" on "feedEntryEnclosures"."id" = "feedEntryEnclosureLinks"."feedEntryEnclosure"
        where "feedEntryEnclosureLinks"."id" is null;
      `,
    )) {
      await fs.rm(
        path.join(
          application.configuration.dataDirectory,
          `files/${feedEntryEnclosure.externalId}`,
        ),
        { recursive: true, force: true },
      );
      application.database.run(
        sql`
          delete from "feedEntryEnclosures" where "id" = ${feedEntryEnclosure.id};
        `,
      );
    }
    application.database.run(
      sql`
        delete from "feedVisualizations" where "createdAt" < ${new Date(Date.now() - 60 * 60 * 1000).toISOString()};
      `,
    );
    application.database.run(
      sql`
        delete from "feedWebSubSubscriptions" where "createdAt" < ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()};
      `,
    );
  });

application.layout = (body) => {
  css`
    @import "@radically-straightforward/javascript/static/index.css";
    @import "@fontsource-variable/public-sans";
    @import "bootstrap-icons/font/bootstrap-icons.css";

    input[type="text"],
    button {
      background-color: light-dark(
        var(--color--slate--50),
        var(--color--slate--950)
      );
      padding: var(--space--1) var(--space--2);
      border: var(--border-width--1) solid
        light-dark(var(--color--slate--400), var(--color--slate--600));
      border-radius: var(--border-radius--1);
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(
        --transition-timing-function--ease-in-out
      );
      &:focus-within {
        border-color: light-dark(
          var(--color--blue--500),
          var(--color--blue--500)
        );
      }
    }

    button {
      cursor: pointer;
    }

    a {
      cursor: pointer;
      text-decoration: underline;
      color: light-dark(var(--color--blue--500), var(--color--blue--500));
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(
        --transition-timing-function--ease-in-out
      );
      &:hover,
      &:focus-within {
        color: light-dark(var(--color--blue--400), var(--color--blue--400));
      }
      &:active {
        color: light-dark(var(--color--blue--600), var(--color--blue--600));
      }
    }

    h2 {
      font-weight: 700;
    }

    small {
      font-size: var(--font-size--3);
      line-height: var(--font-size--3--line-height);
      font-weight: 700;
      color: light-dark(var(--color--slate--500), var(--color--slate--500));
    }

    .tippy-box {
      color: light-dark(var(--color--black), var(--color--white));
      background-color: light-dark(
        var(--color--slate--50),
        var(--color--slate--950)
      );
      border: var(--border-width--1) solid
        light-dark(var(--color--slate--400), var(--color--slate--600));
      border-radius: var(--border-radius--1);
      box-shadow: var(--box-shadow--4);
      &[data-theme~="error"] {
        color: light-dark(var(--color--red--800), var(--color--red--200));
        background-color: light-dark(
          var(--color--red--50),
          var(--color--red--950)
        );
        border-color: light-dark(
          var(--color--red--400),
          var(--color--red--600)
        );
      }
      .tippy-content {
        padding: var(--space--1) var(--space--2);
      }
    }
  `;
  javascript`
    import * as javascript from "@radically-straightforward/javascript/static/index.mjs";
    import * as utilities from "@radically-straightforward/utilities";
  `;
  return html`
    <!doctype html>
    <html
      css="${css`
        color-scheme: light dark;
      `}"
    >
      <head>
        <title>Kill the Newsletter!</title>
        <meta
          name="description"
          content="Convert email newsletters into Atom feeds"
        />
        <meta name="version" content="${application.version}" />
        <link rel="stylesheet" href="/${caddy.staticFiles["index.css"]}" />
        <script src="/${caddy.staticFiles["index.mjs"]}"></script>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>
      <body
        css="${css`
          font-family: "Public Sans Variable", var(--font-family--sans-serif);
          font-size: var(--font-size--3-5);
          line-height: var(--font-size--3-5--line-height);
          color: light-dark(var(--color--black), var(--color--white));
          background-color: light-dark(
            var(--color--white),
            var(--color--black)
          );
          padding: var(--space--4) var(--space--4);
        `}"
      >
        <div
          css="${css`
            max-width: var(--space--144);
            margin: var(--space--0) auto;
            display: flex;
            flex-direction: column;
            gap: var(--space--4);
          `}"
        >
          <div>
            <h1
              css="${css`
                font-size: var(--font-size--4-5);
                line-height: var(--font-size--4-5--line-height);
                font-weight: 700;
              `}"
            >
              <a
                href="/"
                css="${css`
                  text-decoration: none;
                  &:not(:hover, :focus-within, :active) {
                    color: light-dark(var(--color--black), var(--color--white));
                  }
                  display: inline-flex;
                  gap: var(--space--2);
                `}"
              >
                <div>
                  <i class="bi bi-envelope-fill"></i> <i
                    class="bi bi-arrow-right"
                    > </i
                  ><i class="bi bi-rss-fill"></i>
                </div>
                <div>Kill the Newsletter!</div>
              </a>
            </h1>
            <p
              css="${css`
                margin-top: var(--space---1);
              `}"
            >
              <small>Convert email newsletters into Atom feeds</small>
            </p>
          </div>
          $${body}
        </div>
      </body>
    </html>
  `;
};
application.partials.feed = ({ feed, feedEntries }) =>
  html`<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <id>urn:kill-the-newsletter:${feed.externalId}</id>
      <link
        rel="self"
        href="https://${application.configuration
          .hostname}/feeds/${feed.externalId}.xml"
      />
      <link
        rel="hub"
        href="https://${application.configuration
          .hostname}/feeds/${feed.externalId}/websub"
      />
      $${typeof feed.icon === "string"
        ? html`<icon>${feed.icon}</icon>`
        : html``}
      <updated
        >${feedEntries[0]?.createdAt ?? "2000-01-01T00:00:00.000Z"}</updated
      >
      <title>${feed.title}</title>
      $${feedEntries.map(
        (feedEntry) => html`
          <entry>
            <id>urn:kill-the-newsletter:${feedEntry.externalId}</id>
            <link
              rel="alternate"
              type="text/html"
              href="https://${application.configuration
                .hostname}/feeds/${feed.externalId}/entries/${feedEntry.externalId}.html"
            />
            $${application.database
              .all<{
                externalId: string;
                type: string;
                length: number;
                name: string;
              }>(
                sql`
                  select
                    "feedEntryEnclosures"."externalId" as "externalId",
                    "feedEntryEnclosures"."type" as "type",
                    "feedEntryEnclosures"."length" as "length",
                    "feedEntryEnclosures"."name" as "name"
                  from "feedEntryEnclosures"
                  join "feedEntryEnclosureLinks" on
                    "feedEntryEnclosureLinks"."feedEntry" = ${feedEntry.id} and
                    "feedEntryEnclosures"."id" = "feedEntryEnclosureLinks"."feedEntryEnclosure"
                `,
              )
              .map(
                (feedEntryEnclosure) => html`
                  <link
                    rel="enclosure"
                    type="${feedEntryEnclosure.type}"
                    length="${String(feedEntryEnclosure.length)}"
                    href="https://${application.configuration
                      .hostname}/files/${feedEntryEnclosure.externalId}/${feedEntryEnclosure.name}"
                  />
                `,
              )}
            <published>${feedEntry.createdAt}</published>
            <updated>${feedEntry.createdAt}</updated>
            <author>
              <name>${feedEntry.author ?? "Kill the Newsletter!"}</name>
              <email
                >${feedEntry.author ?? "kill-the-newsletter@leafac.com"}</email
              >
            </author>
            <title>${feedEntry.title}</title>
            <content type="html">
              ${feedEntry.content}
              ${html`
                <hr />
                <p>
                  <small>
                    <a
                      href="https://${application.configuration
                        .hostname}/feeds/${feed.externalId}/delete"
                      >Delete Kill the Newsletter! feed</a
                    >
                  </small>
                </p>
              `}
            </content>
          </entry>
        `,
      )}
    </feed>`;
application.server?.push({
  method: "GET",
  pathname: "/",
  handler: (request, response) => {
    response.end(
      application.layout(html`
        <form
          method="POST"
          action="/"
          novalidate
          css="${css`
            display: flex;
            gap: var(--space--2);
            @media (max-width: 400px) {
              flex-direction: column;
            }
          `}"
        >
          <input
            type="text"
            name="title"
            placeholder="Feed title…"
            required
            maxlength="200"
            autofocus
            css="${css`
              flex: 1;
            `}"
          />
          <div><button>Create Feed</button></div>
        </form>
        <p>
          <small>
            <a href="https://leafac.com">By Leandro Facchinetti</a> |
            <a href="https://github.com/leafac/kill-the-newsletter">Source</a> |
            <a href="mailto:kill-the-newsletter@leafac.com">Report Issue</a> |
            <a href="https://patreon.com/leafac">Patreon</a> ·
            <a href="https://paypal.me/LeandroFacchinettiEU">PayPal</a> ·
            <a href="https://github.com/sponsors/leafac">GitHub Sponsors</a>
          </small>
        </p>
        <hr
          css="${css`
            border-top: var(--border-width--1) solid
              light-dark(var(--color--slate--200), var(--color--slate--800));
          `}"
        />
        <div>
          <h2>How does Kill the Newsletter! work?</h2>
          <p>
            Create a feed with the form above and Kill the Newsletter! provides
            you with an email address and an Atom feed. Emails that are received
            at that address are turned into entries in that feed. Sign up to a
            newsletter with that address and use your feed reader to subscribe
            to that feed.
          </p>
        </div>
        <div>
          <h2>How do I confirm my newsletter subscription?</h2>
          <p>
            In most cases when you subscribe to a newsletter the newsletter
            publisher sends you an email with a confirmation link. Kill the
            Newsletter! converts that email into a feed entry as usual, so it
            appears in your feed reader and you may follow the confirmation link
            from there. Some newsletter publishers want you to reply to an email
            using the address that subscribed to the newsletter. Unfortunately
            Kill the Newsletter! doesn’t support this scenario, but you may
            contact the newsletter publisher and ask them to verify you
            manually. As a workaround, some people have had success with signing
            up for the newsletter using their regular email address and setting
            up a filter to forward the emails to Kill the Newsletter!
          </p>
        </div>
        <div>
          <h2>
            Why can’t I subscribe to a newsletter with my Kill the Newsletter!
            email?
          </h2>
          <p>
            Some newsletter publishers block Kill the Newsletter!. You may
            contact them to explain why using Kill the Newsletter! is important
            to you and ask them to reconsider their decision, but ultimately
            it’s their content and their choice of who has access to it and by
            what means. As a workaround, some people have had success with
            signing up for the newsletter using their regular email address and
            setting up a filter to forward the emails to Kill the Newsletter!
          </p>
        </div>
        <div>
          <h2>How do I share a Kill the Newsletter! feed?</h2>
          <p>
            You don’t. The feed includes the identifier for the email address
            and anyone who has access to it may unsubscribe you from your
            newsletters, send you spam, and so forth. Instead of sharing a feed,
            you may share Kill the Newsletter! itself and let people create
            their own Kill the Newsletter! feeds. Kill the Newsletter! has been
            designed this way because it plays better with newsletter
            publishers, who may, for example, get statistics on the number of
            subscribers who use Kill the Newsletter!. Note that Kill the
            Newsletter! itself doesn’t track users in any way.
          </p>
        </div>
        <div>
          <h2>Why are old entries disappearing?</h2>
          <p>
            When Kill the Newsletter! receives an email it may delete old
            entries to keep the feed under a size limit, because some feed
            readers don’t support feeds that are too big.
          </p>
        </div>
        <div>
          <h2>Why isn’t my feed updating?</h2>
          <p>
            Send an email to the address that corresponds to your Kill the
            Newsletter! feed and wait a few minutes. If the email shows up on
            your feed reader, then the issue must be with the newsletter
            publisher and you should contact them. Otherwise, please
            <a href="mailto:kill-the-newsletter@leafac.com"
              >report the issue us</a
            >.
          </p>
        </div>
        <div>
          <h2>How do I delete my Kill the Newsletter! feed?</h2>
          <p>
            At the end of each feed entry there’s a link to delete the Kill the
            Newsletter! feed.
          </p>
        </div>
        <div>
          <h2>
            I’m a newsletter publisher and I saw some people subscribing with
            Kill the Newsletter!. What is this?
          </h2>
          <p>
            Think of Kill the Newsletter! as an email provider like Gmail, but
            the emails get delivered through Atom feeds for people who prefer to
            read with feed readers instead of email. Also, consider providing
            your content through an Atom feed—your readers will appreciate it.
          </p>
        </div>
      `),
    );
  },
});
application.server?.push({
  method: "POST",
  pathname: "/",
  handler: (
    request: serverTypes.Request<{}, {}, {}, { title: string }, {}>,
    response,
  ) => {
    if (
      typeof request.body.title !== "string" ||
      request.body.title === "" ||
      request.body.title.length > 200
    )
      throw "validation";
    const feed = application.database.get<{
      externalId: string;
      title: string;
    }>(
      sql`
        select * from "feeds" where "id" = ${
          application.database.run(
            sql`
              insert into "feeds" ("externalId", "title")
              values (
                ${cryptoRandomString({
                  length: 20,
                  characters: "abcdefghijklmnopqrstuvwxyz0123456789",
                })},
                ${request.body.title}
              );
            `,
          ).lastInsertRowid
        };
      `,
    )!;
    response.end(
      request.headers.accept === "application/json"
        ? JSON.stringify({
            feedId: feed.externalId,
            email: `${feed.externalId}@${application.configuration.hostname}`,
            feed: `https://${
              application.configuration.hostname
            }/feeds/${feed.externalId}.xml`,
          })
        : application.layout(html`
            <p>Feed “${feed.title}” created.</p>
            <div>
              <p>Subscribe to a newsletter with the following email address:</p>
              <div
                css="${css`
                  display: flex;
                  gap: var(--space--2);
                  @media (max-width: 400px) {
                    flex-direction: column;
                  }
                `}"
              >
                <input
                  type="text"
                  value="${feed.externalId}@${application.configuration
                    .hostname}"
                  readonly
                  css="${css`
                    flex: 1;
                  `}"
                  javascript="${javascript`
                    this.onclick = () => {
                      this.select();
                    };
                  `}"
                />
                <div>
                  <button
                    javascript="${javascript`
                      this.onclick = async () => {
                        await navigator.clipboard.writeText(${`${feed.externalId}@${application.configuration.hostname}`});
                        javascript.tippy({
                          element: this,
                          trigger: "manual",
                          content: "Copied",
                        }).show();
                        await utilities.sleep(1000);
                        this.tooltip.hide();
                      };
                    `}"
                  >
                    <i class="bi bi-copy"></i>  Copy
                  </button>
                </div>
              </div>
            </div>
            <div>
              <p>Subscribe on your feed reader to the following Atom feed:</p>
              <div
                css="${css`
                  display: flex;
                  gap: var(--space--2);
                  @media (max-width: 400px) {
                    flex-direction: column;
                  }
                `}"
              >
                <input
                  type="text"
                  value="https://${application.configuration
                    .hostname}/feeds/${feed.externalId}.xml"
                  readonly
                  css="${css`
                    flex: 1;
                  `}"
                  javascript="${javascript`
                    this.onclick = () => {
                      this.select();
                    };
                  `}"
                />
                <div>
                  <button
                    javascript="${javascript`
                      this.onclick = async () => {
                        await navigator.clipboard.writeText(${`https://${
                          application.configuration.hostname
                        }/feeds/${feed.externalId}.xml`});
                        javascript.tippy({
                          element: this,
                          trigger: "manual",
                          content: "Copied",
                        }).show();
                        await utilities.sleep(1000);
                        this.tooltip.hide();
                      };
                    `}"
                  >
                    <i class="bi bi-copy"></i>  Copy
                  </button>
                </div>
              </div>
            </div>
            <p><a href="/">← Create Another Feed</a></p>
          `),
    );
  },
});
application.server?.push({
  pathname: new RegExp(
    "^/feeds/(?<feedExternalId>[A-Za-z0-9]+)(?:$|/|\\.xml$)",
  ),
  handler: (
    request: serverTypes.Request<
      { feedExternalId: string },
      {},
      {},
      {},
      Application["types"]["states"]["Feed"]
    >,
    response,
  ) => {
    if (typeof request.pathname.feedExternalId !== "string") return;
    request.state.feed = application.database.get<{
      id: number;
      externalId: string;
      title: string;
      icon: string | null;
    }>(
      sql`
        select "id", "externalId", "title", "icon"
        from "feeds"
        where "externalId" = ${request.pathname.feedExternalId};
      `,
    );
    if (request.state.feed === undefined) return;
    response.setHeader("X-Robots-Tag", "none");
  },
});
application.server?.push({
  method: "GET",
  pathname: new RegExp("^/feeds/(?<feedExternalId>[A-Za-z0-9]+)\\.xml$"),
  handler: (
    request: serverTypes.Request<
      {},
      {},
      {},
      {},
      Application["types"]["states"]["Feed"]
    >,
    response,
  ) => {
    if (request.state.feed === undefined) return;
    if (
      application.database.get<{ count: number }>(
        sql`
          select count(*) as "count"
          from "feedVisualizations"
          where
            "feed" = ${request.state.feed.id} and
            ${new Date(Date.now() - 60 * 60 * 1000).toISOString()} < "createdAt";
      `,
      )!.count > 10
    ) {
      response.statusCode = 429;
      response.end(
        application.layout(html`
          <p>
            Rate limit. This feed was visualized too often. Please return in one
            hour.
          </p>
        `),
      );
      return;
    }
    application.database.run(
      sql`
        insert into "feedVisualizations" ("feed", "createdAt")
        values (${request.state.feed.id}, ${new Date().toISOString()});
      `,
    );
    const feedEntries = application.database.all<{
      id: number;
      externalId: string;
      createdAt: string;
      author: string | null;
      title: string;
      content: string;
    }>(
      sql`
        select "id", "externalId", "createdAt", "author", "title", "content"
        from "feedEntries"
        where "feed" = ${request.state.feed.id}
        order by "id" desc;
      `,
    );
    response
      .setHeader("Content-Type", "application/atom+xml; charset=utf-8")
      .end(
        application.partials.feed({ feed: request.state.feed, feedEntries }),
      );
  },
});
application.server?.push({
  method: "GET",
  pathname: new RegExp(
    "^/feeds/(?<feedExternalId>[A-Za-z0-9]+)/entries/(?<feedEntryExternalId>[A-Za-z0-9]+)\\.html$",
  ),
  handler: (
    request: serverTypes.Request<
      { feedEntryExternalId: string },
      {},
      {},
      {},
      Application["types"]["states"]["Feed"]
    >,
    response,
  ) => {
    if (
      request.state.feed === undefined ||
      typeof request.pathname.feedEntryExternalId !== "string"
    )
      return;
    const feedEntry = application.database.get<{
      content: string;
    }>(
      sql`
        select "feedEntries"."content" as "content"
        from "feedEntries"
        where
          "feedEntries"."feed" = ${request.state.feed.id} and
          "feedEntries"."externalId" = ${request.pathname.feedEntryExternalId};
      `,
    );
    if (feedEntry === undefined) return;
    response
      .setHeader(
        "Content-Security-Policy",
        "default-src 'self'; img-src *; style-src 'self' 'unsafe-inline'; frame-src 'none'; object-src 'none'; form-action 'self'; frame-ancestors 'none'",
      )
      .setHeader("Cross-Origin-Embedder-Policy", "unsafe-none")
      .end(feedEntry.content);
  },
});
application.server?.push({
  method: "POST",
  pathname: new RegExp("^/feeds/(?<feedExternalId>[A-Za-z0-9]+)/websub$"),
  handler: async (
    request: serverTypes.Request<
      {},
      {},
      {},
      {
        "hub.mode": "subscribe" | "unsubscribe";
        "hub.topic": string;
        "hub.url": string;
        "hub.callback": string;
        "hub.secret": string;
      },
      Application["types"]["states"]["Feed"]
    >,
    response,
  ) => {
    if (request.state.feed === undefined) return;
    request.body["hub.topic"] ??= request.body["hub.url"];
    if (
      (request.body["hub.mode"] !== "subscribe" &&
        request.body["hub.mode"] !== "unsubscribe") ||
      request.body["hub.topic"] !==
        `https://${
          application.configuration.hostname
        }/feeds/${request.state.feed.externalId}.xml` ||
      typeof request.body["hub.callback"] !== "string" ||
      (() => {
        try {
          return new URL(request.body["hub.callback"]).href;
        } catch {
          return undefined;
        }
      })() !== request.body["hub.callback"] ||
      (new URL(request.body["hub.callback"]).protocol !== "https:" &&
        new URL(request.body["hub.callback"]).protocol !== "http:") ||
      new URL(request.body["hub.callback"]).hostname ===
        application.configuration.hostname ||
      new URL(request.body["hub.callback"]).hostname === "localhost" ||
      new URL(request.body["hub.callback"]).hostname === "127.0.0.1" ||
      (request.body["hub.secret"] !== undefined &&
        typeof request.body["hub.secret"] !== "string") ||
      (typeof request.body["hub.secret"] === "string" &&
        request.body["hub.secret"].length === 0) ||
      (request.body["hub.mode"] === "subscribe" &&
        application.database.get<{ count: number }>(
          sql`
          select count(*) as "count"
          from "feedWebSubSubscriptions"
          where
            "feed" = ${request.state.feed.id} and
            ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()} < "createdAt" and
            "callback" != ${request.body["hub.callback"]};
        `,
        )!.count > 10)
    )
      throw "validation";
    const feedWebSubSubscription = application.database.get<{ id: number }>(
      sql`
        select "id"
        from "feedWebSubSubscriptions"
        where
          "feed" = ${request.state.feed!.id} and
          "callback" = ${request.body["hub.callback"]};
      `,
    );
    if (
      request.body["hub.mode"] === "unsubscribe" &&
      feedWebSubSubscription === undefined
    )
      return;
    application.database.run(
      sql`
        insert into "_backgroundJobs" (
          "type",
          "startAt",
          "parameters"
        )
        values (
          ${"feedWebSubSubscriptions.verify"},
          ${new Date().toISOString()},
          ${JSON.stringify({
            feedId: request.state.feed.id,
            "hub.mode": request.body["hub.mode"],
            "hub.topic": request.body["hub.topic"],
            "hub.callback": request.body["hub.callback"],
            "hub.secret": request.body["hub.secret"],
          })}
        );
      `,
    );
    response.statusCode = 202;
    response.end();
  },
});
if (application.commandLineArguments.values.type === "backgroundJob")
  for (
    let backgroundJobIndex = 0;
    backgroundJobIndex < 32;
    backgroundJobIndex++
  )
    application.database.backgroundJob(
      { type: "feedWebSubSubscriptions.verify" },
      async (job: {
        feedId: number;
        "hub.mode": "subscribe" | "unsubscribe";
        "hub.topic": string;
        "hub.callback": string;
        "hub.secret": string;
      }) => {
        const feed = application.database.get<{
          id: number;
        }>(
          sql`
            select "id"
            from "feeds"
            where "id" = ${job.feedId};
          `,
        );
        if (feed === undefined) return;
        const feedWebSubSubscription = application.database.get<{ id: number }>(
          sql`
            select "id"
            from "feedWebSubSubscriptions"
            where
              "feed" = ${feed.id} and
              "callback" = ${job["hub.callback"]};
          `,
        );
        if (
          job["hub.mode"] === "unsubscribe" &&
          feedWebSubSubscription === undefined
        )
          return;
        const verificationChallenge = cryptoRandomString({
          length: 100,
          characters: "abcdefghijklmnopqrstuvwxyz0123456789",
        });
        const verificationURL = new URL(job["hub.callback"]);
        verificationURL.searchParams.append("hub.mode", job["hub.mode"]);
        verificationURL.searchParams.append("hub.topic", job["hub.topic"]);
        verificationURL.searchParams.append(
          "hub.challenge",
          verificationChallenge,
        );
        if (job["hub.mode"] === "subscribe")
          verificationURL.searchParams.append(
            "hub.lease_seconds",
            String(24 * 60 * 60),
          );
        const verificationResponse = await fetch(verificationURL, {
          redirect: "manual",
        });
        if (
          !verificationResponse.ok ||
          (await verificationResponse.text()) !== verificationChallenge
        )
          return;
        switch (job["hub.mode"]) {
          case "subscribe":
            if (feedWebSubSubscription === undefined)
              application.database.run(
                sql`
                  insert into "feedWebSubSubscriptions" (
                    "feed",
                    "createdAt",
                    "callback",
                    "secret"
                  )
                  values (
                    ${feed.id},
                    ${new Date().toISOString()},
                    ${job["hub.callback"]},
                    ${job["hub.secret"]}
                  );
                `,
              );
            else
              application.database.run(
                sql`
                  update "feedWebSubSubscriptions"
                  set
                    "createdAt" = ${new Date().toISOString()},
                    "secret" = ${job["hub.secret"]}
                  where "id" = ${feedWebSubSubscription.id};
                `,
              );
            break;
          case "unsubscribe":
            application.database.run(
              sql`
                delete from "feedWebSubSubscriptions" where "id" = ${feedWebSubSubscription!.id};
              `,
            );
            break;
        }
      },
    );
application.server?.push({
  method: "GET",
  pathname: new RegExp("^/feeds/(?<feedExternalId>[A-Za-z0-9]+)/delete$"),
  handler: (
    request: serverTypes.Request<
      {},
      {},
      {},
      {},
      Application["types"]["states"]["Feed"]
    >,
    response,
  ) => {
    if (request.state.feed === undefined) return;
    response.end(
      application.layout(html`
        <p>
          <i class="bi bi-exclamation-triangle-fill"></i> This action is
          irreversible! Your feed and all its entries will be lost!
        </p>
        <p>
          Before you proceed, we recommend that you unsubscribe from the
          publisher (typically you do that by following a link in a feed entry)
          and unsubscribe from the feed on the feed reader.
        </p>
        <p>
          To delete the feed, please confirm the feed title:
          “${request.state.feed.title}”
        </p>
        <form
          method="DELETE"
          action="https://${application.configuration.hostname}/feeds/${request
            .state.feed.externalId}"
          novalidate
          css="${css`
            display: flex;
            gap: var(--space--2);
            @media (max-width: 400px) {
              flex-direction: column;
            }
          `}"
        >
          <input
            type="text"
            placeholder="${request.state.feed.title}"
            required
            autofocus
            css="${css`
              flex: 1;
            `}"
            javascript="${javascript`
              this.onvalidate = () => {
                if (this.value !== ${request.state.feed.title})
                  throw new javascript.ValidationError(${`Incorrect feed title: “${request.state.feed.title}”`});
              };
            `}"
          />
          <button>Delete Feed</button>
        </form>
      `),
    );
  },
});
application.server?.push({
  method: "DELETE",
  pathname: new RegExp("^/feeds/(?<feedExternalId>[A-Za-z0-9]+)$"),
  handler: (
    request: serverTypes.Request<
      {},
      {},
      {},
      {},
      Application["types"]["states"]["Feed"]
    >,
    response,
  ) => {
    if (request.state.feed === undefined) return;
    application.database.executeTransaction(() => {
      application.database.run(
        sql`
          delete from "feedWebSubSubscriptions" where "feed" = ${request.state.feed!.id};
        `,
      );
      application.database.run(
        sql`
          delete from "feedVisualizations" where "feed" = ${request.state.feed!.id};
        `,
      );
      for (const feedEntry of application.database.all<{ id: number }>(
        sql`
          select "id" from "feedEntries" where "feed" = ${request.state.feed!.id};
        `,
      )) {
        application.database.run(
          sql`
            delete from "feedEntryEnclosureLinks" where "feedEntry" = ${feedEntry.id};
          `,
        );
        application.database.run(
          sql`
            delete from "feedEntries" where "id" = ${feedEntry.id};
          `,
        );
      }
      application.database.run(
        sql`
          delete from "feeds" where "id" = ${request.state.feed!.id};
        `,
      );
    });
    response.end(
      application.layout(html`
        <p>Feed deleted successfully.</p>
        <p><a href="/">← Create a New Feed</a></p>
      `),
    );
  },
});
application.server?.push({
  handler: (request, response) => {
    response.statusCode = 404;
    response.end(
      application.layout(html`
        <p>Not found.</p>
        <p>
          If you expected to see the web version of a newsletter entry, you may
          be interested in the answer to the question
          <a href="/">“Why are old entries disappearing?”</a>.
        </p>
      `),
    );
  },
});
application.server?.push({
  error: true,
  handler: (request, response) => {
    response.end(
      application.layout(html`
        <p>Something went wrong.</p>
        <p>
          Please report this issue to
          <a href="mailto:kill-the-newsletter@leafac.com"
            >kill-the-newsletter@leafac.com</a
          >.
        </p>
      `),
    );
  },
});

if (application.commandLineArguments.values.type === "email") {
  application.email = new SMTPServer({
    name: application.configuration.hostname,
    size: 2 ** 20,
    disabledCommands: ["AUTH"],
    key: await fs.readFile(application.configuration.tls.key, "utf-8"),
    cert: await fs.readFile(application.configuration.tls.certificate, "utf-8"),
    onData: async (emailStream, session, callback) => {
      try {
        if (
          session.envelope.mailFrom === false ||
          session.envelope.mailFrom.address.match(utilities.emailRegExp) ===
            null ||
          ["blogtrottr.com", "feedrabbit.com"].some((hostname) =>
            (session.envelope.mailFrom as SMTPServerAddress).address.endsWith(
              "@" + hostname,
            ),
          )
        )
          throw new Error("Invalid ‘mailFrom’.");
        const feeds = session.envelope.rcptTo.flatMap(({ address }) => {
          if (
            application.configuration.environment !== "development" &&
            address.match(utilities.emailRegExp) === null
          )
            return [];
          const [feedExternalId, hostname] = address.split("@");
          if (hostname !== application.configuration.hostname) return [];
          const feed = application.database.get<{
            id: number;
            externalId: string;
          }>(
            sql`
              select "id", "externalId" from "feeds" where "externalId" = ${feedExternalId};
            `,
          );
          if (feed === undefined) return [];
          return [feed];
        });
        if (feeds.length === 0) throw new Error("No valid recipients.");
        const email = await mailParser.simpleParser(emailStream);
        if (emailStream.sizeExceeded) throw new Error("Email is too big.");
        const feedEntryEnclosures = new Array<{ id: number }>();
        for (const attachment of email.attachments) {
          const feedEntryEnclosure = application.database.get<{
            id: number;
            externalId: string;
            name: string;
          }>(
            sql`
              select * from "feedEntryEnclosures" where "id" = ${
                application.database.run(
                  sql`
                    insert into "feedEntryEnclosures" (
                      "externalId",
                      "type",
                      "length",
                      "name"
                    )
                    values (
                      ${cryptoRandomString({
                        length: 20,
                        characters: "abcdefghijklmnopqrstuvwxyz0123456789",
                      })},
                      ${attachment.contentType},
                      ${attachment.size},
                      ${
                        attachment.filename?.replaceAll(
                          /[^A-Za-z0-9_.-]/g,
                          "-",
                        ) ?? "untitled"
                      }
                    );
                  `,
                ).lastInsertRowid
              };
            `,
          )!;
          await fs.mkdir(
            path.join(
              application.configuration.dataDirectory,
              `files/${feedEntryEnclosure.externalId}`,
            ),
            { recursive: true },
          );
          await fs.writeFile(
            path.join(
              application.configuration.dataDirectory,
              `files/${feedEntryEnclosure.externalId}/${feedEntryEnclosure.name}`,
            ),
            attachment.content,
          );
          feedEntryEnclosures.push(feedEntryEnclosure);
        }
        for (const feed of feeds)
          application.database.executeTransaction(() => {
            application.database.run(
              sql`
                update "feeds"
                set "icon" = ${`https://${(session.envelope.mailFrom as SMTPServerAddress).address.split("@")[1]}/favicon.ico`}
                where "id" = ${feed.id};
              `,
            );
            const feedEntry = application.database.get<{
              id: number;
              externalId: string;
            }>(
              sql`
                select * from "feedEntries" where "id" = ${
                  application.database.run(
                    sql`
                      insert into "feedEntries" (
                        "externalId",
                        "feed",
                        "createdAt",
                        "author",
                        "title",
                        "content"
                      )
                      values (
                        ${cryptoRandomString({
                          length: 20,
                          characters: "abcdefghijklmnopqrstuvwxyz0123456789",
                        })},
                        ${feed.id},
                        ${new Date().toISOString()},
                        ${(session.envelope.mailFrom as SMTPServerAddress).address},
                        ${email.subject ?? "Untitled"},
                        ${typeof email.html === "string" ? email.html : typeof email.textAsHtml === "string" ? email.textAsHtml : "No content."}
                      );
                    `,
                  ).lastInsertRowid
                };
              `,
            )!;
            for (const feedEntryEnclosure of feedEntryEnclosures)
              application.database.run(
                sql`
                  insert into "feedEntryEnclosureLinks" (
                    "feedEntry",
                    "feedEntryEnclosure"
                  ) values (
                    ${feedEntry.id},
                    ${feedEntryEnclosure.id}
                  );
                `,
              );
            const deletedFeedEntries = application.database.all<{
              id: number;
              externalId: string;
              title: string;
              content: string;
            }>(
              sql`
                select "id", "externalId", "title", "content"
                from "feedEntries"
                where "feed" = ${feed.id}
                order by "id" asc;
              `,
            );
            let feedLength = 0;
            while (deletedFeedEntries.length > 0) {
              const feedEntry = deletedFeedEntries.pop()!;
              feedLength += feedEntry.title.length + feedEntry.content.length;
              if (feedLength > 2 ** 20) break;
            }
            for (const deletedFeedEntry of deletedFeedEntries) {
              application.database.run(
                sql`
                  delete from "feedEntryEnclosureLinks" where "feedEntry" = ${deletedFeedEntry.id};
                `,
              );
              application.database.run(
                sql`
                  delete from "feedEntries" where "id" = ${deletedFeedEntry.id};
                `,
              );
            }
            for (const feedWebSubSubscription of application.database.all<{
              id: number;
            }>(
              sql`
                select "id"
                from "feedWebSubSubscriptions"
                where
                  "feed" = ${feed.id} and
                  ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()} < "createdAt";
              `,
            ))
              application.database.run(
                sql`
                  insert into "_backgroundJobs" (
                    "type",
                    "startAt",
                    "parameters"
                  )
                  values (
                    ${"feedWebSubSubscriptions.dispatch"},
                    ${new Date().toISOString()},
                    ${JSON.stringify({
                      feedId: feed.id,
                      feedEntryId: feedEntry.id,
                      feedWebSubSubscriptionId: feedWebSubSubscription.id,
                    })}
                  );
                `,
              );
            utilities.log(
              "EMAIL",
              "SUCCESS",
              "FEED",
              String(feed.externalId),
              "ENTRY",
              feedEntry.externalId,
              session.envelope.mailFrom === false
                ? ""
                : session.envelope.mailFrom.address,
              "DELETED ENTRIES",
              JSON.stringify(
                deletedFeedEntries.map(
                  (deletedFeedEntry) => deletedFeedEntry.externalId,
                ),
              ),
            );
          });
      } catch (error) {
        utilities.log(
          "EMAIL",
          "ERROR",
          session.envelope.mailFrom === false
            ? ""
            : session.envelope.mailFrom.address,
          String(error),
        );
      } finally {
        emailStream.resume();
        await stream.finished(emailStream);
        callback();
      }
    },
  });
  application.email.listen(25);
  process.once("gracefulTermination", () => {
    application.email!.close();
  });
  for (const file of [
    application.configuration.tls.key,
    application.configuration.tls.certificate,
  ])
    fsSync
      .watchFile(file, () => {
        node.exit();
      })
      .unref();
}
if (application.commandLineArguments.values.type === "backgroundJob")
  for (let backgroundJobIndex = 0; backgroundJobIndex < 8; backgroundJobIndex++)
    application.database.backgroundJob(
      { type: "feedWebSubSubscriptions.dispatch" },
      async (job: {
        feedId: number;
        feedEntryId: number;
        feedWebSubSubscriptionId: number;
      }) => {
        const feed = application.database.get<{
          externalId: string;
          title: string;
          icon: string | null;
        }>(
          sql`
            select "externalId", "title", "icon"
            from "feeds"
            where "id" = ${job.feedId};
          `,
        );
        if (feed === undefined) return;
        const feedEntry = application.database.get<{
          id: number;
          externalId: string;
          createdAt: string;
          author: string | null;
          title: string;
          content: string;
        }>(
          sql`
            select "id", "externalId", "createdAt", "author", "title", "content"
            from "feedEntries"
            where "id" = ${job.feedEntryId};
          `,
        );
        if (feedEntry === undefined) return;
        const feedWebSubSubscription = application.database.get<{
          id: number;
          callback: string;
          secret: string | null;
        }>(
          sql`
            select "id", "callback", "secret"
            from "feedWebSubSubscriptions"
            where "id" = ${job.feedWebSubSubscriptionId};
          `,
        );
        if (feedWebSubSubscription === undefined) return;
        const body = application.partials.feed({
          feed,
          feedEntries: [feedEntry],
        });
        const response = await fetch(feedWebSubSubscription.callback, {
          redirect: "manual",
          method: "POST",
          headers: {
            "Content-Type": "application/atom+xml; charset=utf-8",
            Link: `<https://${
              application.configuration.hostname
            }/feeds/${feed.externalId}.xml>; rel="self", <https://${
              application.configuration.hostname
            }/feeds/${feed.externalId}/websub>; rel="hub"`,
            ...(typeof feedWebSubSubscription.secret === "string"
              ? {
                  "X-Hub-Signature": `sha256=${crypto.createHmac("sha256", feedWebSubSubscription.secret).update(body).digest("hex")}`,
                }
              : {}),
          },
          body,
        });
        if (response.status === 410)
          application.database.run(
            sql`
              delete from "feedWebSubSubscriptions" where "id" = ${feedWebSubSubscription.id};
            `,
          );
        else if (String(response.status).startsWith("4"))
          utilities.log(
            "feedWebSubSubscriptions.dispatch",
            "REQUEST ERROR",
            String(response),
          );
        else if (!response.ok) throw new Error(`Response: ${String(response)}`);
      },
    );

if (application.commandLineArguments.values.type === undefined) {
  for (const port of application.configuration.ports) {
    node.childProcessKeepAlive(() =>
      childProcess.spawn(
        process.argv[0],
        [
          process.argv[1],
          ...application.commandLineArguments.positionals,
          "--type",
          "server",
          "--port",
          String(port),
        ],
        {
          env: {
            ...process.env,
            NODE_ENV: application.configuration.environment,
          },
          stdio: "inherit",
        },
      ),
    );
    node.childProcessKeepAlive(() =>
      childProcess.spawn(
        process.argv[0],
        [
          process.argv[1],
          ...application.commandLineArguments.positionals,
          "--type",
          "backgroundJob",
          "--port",
          String(port),
        ],
        {
          env: {
            ...process.env,
            NODE_ENV: application.configuration.environment,
          },
          stdio: "inherit",
        },
      ),
    );
  }
  node.childProcessKeepAlive(() =>
    childProcess.spawn(
      process.argv[0],
      [
        process.argv[1],
        ...application.commandLineArguments.positionals,
        "--type",
        "email",
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: application.configuration.environment,
        },
        stdio: "inherit",
      },
    ),
  );
  caddy.start({
    ...application.configuration,
    untrustedStaticFilesRoots: [
      `/files/* "${path.join(process.cwd(), "data")}"`,
    ],
  });
}
