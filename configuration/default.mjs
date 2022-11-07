import path from "node:path";

export default {
  hostname: "localhost",
  dataDirectory: path.join(process.cwd(), "data"),
  email: {
    options: { streamTransport: true, buffer: true },
    defaults: {
      from: {
        name: "Courselore",
        address: "feedback@courselore.org",
      },
    },
  },
  administratorEmail: "feedback@courselore.org",
  environment: "other",
};
