import express from "express";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { Layout, Form } from "./components";

const app = express();
const doctype = `<!DOCTYPE html>\n`;

app.use(express.static("static"));

app.get("/", (req, res) =>
  res.send(
    doctype +
      ReactDOMServer.renderToStaticMarkup(
        <Layout>
          <Form></Form>
        </Layout>
      )
  )
);

app.listen(4000);
