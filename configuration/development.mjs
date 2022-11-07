import url from "node:url";

export default {
  hostname: process.env.TUNNEL ?? process.env.HOSTNAME ?? "localhost",
  dataDirectory: url.fileURLToPath(new URL("../data/", import.meta.url)),
  administratorEmail: "kill-the-newsletter@leafac.com",
  environment: "development",
  tunnel: typeof process.env.TUNNEL === "string",
};
