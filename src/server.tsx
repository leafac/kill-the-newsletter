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

export const webServer = express()
  .use(express.static("static"))
  .use(express.urlencoded({ extended: true }))
  .get("/", (req, res) =>
    res.send(
      renderHtml(
        <Layout>
          <Form></Form>
        </Layout>
      )
    )
  )
  .post("/", (req, res) => {
    const inbox: Inbox = { name: req.body.name, token: newToken() };
    fs.writeFileSync(feedPath(inbox.token), renderXml(Feed(inbox)));
    res.send(
      renderHtml(
        <Layout>
          <Created inbox={inbox}></Created>
        </Layout>
      )
    );
  })
  .listen(8443);
