import * as xmlbuilder2 from "xmlbuilder2";
import fs from "fs";
import writeFileAtomic from "write-file-atomic";

(async () => {
  console.log("STARTED");
  for (const feed of fs
    .readdirSync("static/feeds")
    .filter((file) => !file.startsWith("."))) {
    try {
      const path = `static/feeds/${feed}`;
      await writeFileAtomic(
        path,
        xmlbuilder2.convert(
          { invalidCharReplacement: "" },
          fs.readFileSync(path, "utf8"),
          {
            format: "xml",
            noDoubleEncoding: true,
            prettyPrint: true,
          }
        )
      );
      console.log(`FIXED ${feed}`);
    } catch (error) {
      console.log(`ERROR ${feed}: ${error}`);
    }
  }
  console.log("FINISHED");
})();
