import express from "express";
import React from "react";
import ReactDOMServer from "react-dom/server";
import {
  Inbox,
  Layout,
  Form,
  Created,
  Feed,
  newToken,
  feedPath
} from "./components";
import { Builder } from "xml2js";
import fs from "fs";

const app = express();

app.use(express.static("static"));
app.use(express.urlencoded());

app.get("/", (req, res) =>
  res.send(
    render(
      <Layout>
        <Form></Form>
      </Layout>
    )
  )
);

app.post("/", (req, res) => {
  const inbox: Inbox = { name: req.body.name, token: newToken() };
  fs.writeFileSync(
    feedPath(inbox.token),
    new Builder().buildObject(Feed(inbox))
  );
  res.send(
    render(
      <Layout>
        <Created inbox={inbox}></Created>
      </Layout>
    )
  );
});

app.listen(8000);

function render(component: React.ReactElement): string {
  return `<!DOCTYPE html>\n${ReactDOMServer.renderToStaticMarkup(component)}`;
}
