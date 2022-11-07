import path from "node:path";

export default {
  hostname: "localhost",
  dataDirectory: path.join(process.cwd(), "data"),
  administratorEmail: "kill-the-newsletter@leafac.com",
  environment: "other",
};
