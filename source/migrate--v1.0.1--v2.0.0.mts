import timers from "node:timers/promises";
import sql, { Database } from "@radically-straightforward/sqlite";
import * as utilities from "@radically-straightforward/utilities";

const oldDatabase = new Database(process.argv[2]);
const newDatabase = await new Database(process.argv[3]).migrate(
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
);

let feedsCount = oldDatabase.get<{ count: number }>(
  sql`
    SELECT COUNT(*) AS "count" FROM "feeds"
  `,
)!.count;
utilities.log(String(feedsCount));
let feedsMigrated = 0;
for (const feed of oldDatabase.iterate<{
  id: number;
  reference: string;
  title: string;
}>(
  sql`
    SELECT "id", "reference", "title" FROM "feeds" ORDER BY "id" ASC
  `,
)) {
  if (feedsCount % 1000 === 0) utilities.log(String(feedsCount));
  feedsCount--;
  if (
    newDatabase.get(
      sql`
      SELECT TRUE FROM "feeds" WHERE "reference" = ${feed.reference}
    `,
    ) !== undefined
  )
    continue;
  newDatabase.executeTransaction(() => {
    const newFeedId = newDatabase.run(
      sql`
        INSERT INTO "feeds" ("reference", "title") VALUES (${feed.reference}, ${feed.title})
      `,
    ).lastInsertRowid;
    for (const entry of oldDatabase.iterate<{
      reference: string;
      createdAt: string;
      title: string;
      content: string;
    }>(
      sql`
        SELECT "reference", "createdAt", "title", "content"
        FROM "entries"
        WHERE "feed" = ${feed.id}
        ORDER BY "id" ASC
      `,
    ))
      newDatabase.run(
        sql`
          INSERT INTO "entries" ("reference", "createdAt", "feed", "title", "content")
          VALUES (
            ${entry.reference},
            ${new Date(entry.createdAt).toISOString()},
            ${newFeedId},
            ${entry.title},
            ${entry.content}
          )
        `,
      );
  });
  feedsMigrated++;
  if (feedsMigrated === 10000) {
    utilities.log("STOPPING EARLY");
    process.exit(1);
  }
  await timers.setTimeout();
}

utilities.log("SUCCESS");
