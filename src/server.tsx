import express from "express";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { Layout, Form } from "./components";

const app = express();

app.use(express.static("static"));

app.get("/", (req, res) =>
  res.send(
    render(
      <Layout>
        <Form></Form>
      </Layout>
    )
  )
);

app.listen(8000);

function render(component: React.ReactElement): string {
  return `<!DOCTYPE html>\n${ReactDOMServer.renderToStaticMarkup(component)}`;
}
