import express from "express";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { Layout, Form, Created } from "./components";
import fs from "fs";
import cryptoRandomString from "crypto-random-string";

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
  res.send(
    render(
      <Layout>
        <Created
          name={req.body.name}
          token={cryptoRandomString({
            length: 20,
            characters: "1234567890qwertyuiopasdfghjklzxcvbnm"
          })}
        ></Created>
      </Layout>
    )
  );
});

app.listen(8000);

function render(component: React.ReactElement): string {
  return `<!DOCTYPE html>\n${ReactDOMServer.renderToStaticMarkup(component)}`;
}
