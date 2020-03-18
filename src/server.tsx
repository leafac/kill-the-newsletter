import express from "express";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { Layout } from "./components";

const app = express();

app.use(express.static("static"));

app.get("/", (req, res) =>
  res.send(ReactDOMServer.renderToStaticMarkup(<Layout>Hello World</Layout>))
);

app.listen(4000);
