#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");
const { JSDOM } = require("jsdom");
const { sql, Database } = require("@leafac/sqlite");
const databaseMigrate = require("@leafac/sqlite-migration").default;

const feedFiles = fs.readdirSync("feeds");
fs.ensureDirSync("feeds-migrated");
fs.ensureDirSync("data");
const database = new Database(path.join("data", "kill-the-newsletter.db"));
// prettier-ignore
databaseMigrate(database, [
    sql`
      CREATE TABLE "feeds" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reference" TEXT NOT NULL UNIQUE,
        "title" TEXT NOT NULL
      );

      CREATE TABLE "entries" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reference" TEXT NOT NULL UNIQUE,
        "feed" INTEGER NOT NULL REFERENCES "feeds",
        "title" TEXT NOT NULL,
        "author" TEXT NOT NULL,
        "content" TEXT NOT NULL
      );
    `,
]);
for (const feedFile of feedFiles) {
  process.stdout.write(`${feedFile}...`);
  const feedReference = path.basename(feedFile, ".xml");
  const feedText = fs.readFileSync(path.join("feeds", feedFile));
  const feedDOM = new JSDOM(feedText, { contentType: "application/atom+xml" });
  const feed = feedDOM.window.document;
  database.executeTransaction(() => {
    const feedId = database.run(
      sql`
        INSERT INTO "feeds" ("updatedAt", "reference", "title")
        VALUES (
          ${feed.querySelector("feed > updated").textContent},
          ${feedReference},
          ${feed.querySelector("feed > title").textContent}
        )
      `
    ).lastInsertRowid;
    for (const entry of [...feed.querySelectorAll("feed > entry")].reverse())
      database.run(
        sql`
          INSERT INTO "entries" ("createdAt", "reference", "feed", "title", "author", "content")
          VALUES (
            ${entry.querySelector("updated").textContent},
            ${entry.querySelector("id").textContent.split(":")[2]},
            ${feedId},
            ${entry.querySelector("title").textContent},
            ${entry.querySelector("author > name").textContent},
            ${entry.querySelector("content").textContent}
          )
        `
      );
  });
  fs.moveSync(
    path.join("feeds", feedFile),
    path.join("feeds-migrated", feedFile)
  );
  console.log(" Done");
}
