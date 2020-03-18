import express from "express";
import React from "react";
import {
  Inbox,
  Layout,
  Form,
  Created,
  Feed,
  newToken,
  feedPath,
  renderHtml,
  renderXml
} from "./components";
import fs from "fs";

export const app = express();

app.use(express.static("static"));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) =>
  res.send(
    renderHtml(
      <Layout>
        <Form></Form>
      </Layout>
    )
  )
);

app.post("/", (req, res) => {
  const inbox: Inbox = { name: req.body.name, token: newToken() };
  fs.writeFileSync(feedPath(inbox.token), renderXml(Feed(inbox)));
  res.send(
    renderHtml(
      <Layout>
        <Created inbox={inbox}></Created>
      </Layout>
    )
  );
});

if (require.main === module) app.listen(8000);
