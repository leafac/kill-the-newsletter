module.exports = async (require) => {
  const path = require("path");
  const express = require("express");
  const cookieSession = require("cookie-session");
  const { sql } = require("@leafac/sqlite");
  const AutoEncrypt = require("@small-tech/auto-encrypt");
  const courselore = require(".").default;
  const customization = require(path.join(__dirname, "customization"))(require);

  const app = await courselore(__dirname);

  app.set("url", "https://courselore.org");
  app.set("administrator", "mailto:administrator@courselore.org");

  const reverseProxy = express();

  reverseProxy.use((req, res, next) => {
    if (req.hostname !== new URL(app.get("url")).hostname)
      return res.redirect(`${app.get("url")}${req.originalUrl}`);
    next();
  });
  reverseProxy.use(cookieSession({ secret: app.get("cookie secret") }));
  reverseProxy.use(customization(app));
  reverseProxy.use(app);

  AutoEncrypt.https
    .createServer(
      {
        domains: [
          "courselore.org",
          "www.courselore.org",
          "courselore.com",
          "www.courselore.com",
        ],
        settingsPath: path.join(__dirname, "data/keys/tls"),
      },
      reverseProxy
    )
    .listen(443);
};
