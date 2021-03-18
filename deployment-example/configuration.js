module.exports = async (require) => {
  const path = require("path");
  const express = require("express");
  const AutoEncrypt = require("@small-tech/auto-encrypt");
  const killTheNewsletter = require(".").default;

  const { webApplication, emailApplication } = killTheNewsletter(
    path.join(__dirname, "data")
  );

  webApplication.set("url", "https://kill-the-newsletter.com");
  webApplication.set("email", "smtp://kill-the-newsletter.com");
  webApplication.set("administrator", "mailto:kill-the-newsletter@leafac.com");

  const reverseProxy = express();
  reverseProxy.use((req, res, next) => {
    if (req.hostname !== new URL(webApplication.get("url")).hostname)
      return res.redirect(`${webApplication.get("url")}${req.originalUrl}`);
    next();
  });
  reverseProxy.use(webApplication);

  AutoEncrypt.https
    .createServer(
      {
        domains: ["kill-the-newsletter.com", "www.kill-the-newsletter.com"],
        settingsPath: path.join(__dirname, "data/keys/tls"),
      },
      reverseProxy
    )
    .listen(443);
  emailApplication.listen(25, () => {
    console.log("Email server started");
  });
};
