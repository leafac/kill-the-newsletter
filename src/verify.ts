import xml2js from "xml2js";
import fs from "fs";

(async () => {
  for (const feed of fs
    .readdirSync("static/feeds")
    .filter(file => !file.startsWith("."))) {
    try {
      const xml = await new xml2js.Parser().parseStringPromise(
        fs.readFileSync(`static/feeds/${feed}`, "utf8")
      );
      if (xml?.feed?.updated === undefined)
        throw new Error("Can’t find xml.feed.updated");
      new xml2js.Builder().buildObject(xml);
      console.log(`OK ${feed}`);
    } catch (error) {
      console.log(`ERROR ${feed}: ${error}`);
    }
  }
  console.log("FINISHED");
})();
