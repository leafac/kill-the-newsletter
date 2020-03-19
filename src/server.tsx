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

const webApp = express();

webApp.use(express.static("static"));
webApp.use(express.urlencoded({ extended: true }));

webApp.get("/", (req, res) =>
  res.send(
    renderHtml(
      <Layout>
        <Form></Form>
      </Layout>
    )
  )
);

webApp.post("/", (req, res) => {
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

export const webServer = webApp.listen(8443);
