module.exports = (require) => {
  const path = require("path");
  const killTheNewsletter = require(".").default;
  const { webApplication, emailApplication } = killTheNewsletter(
    path.join(__dirname, "data")
  );

  webApplication.listen(new URL(webApplication.get("url")).port, () => {
    console.log(`Web server started at ${webApplication.get("url")}`);
  });

  emailApplication.listen(new URL(webApplication.get("email")).port, () => {
    console.log(`Email server started at ${webApplication.get("email")}`);
  });
};
