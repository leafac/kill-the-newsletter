import * as xmlbuilder2 from "xmlbuilder2";
import fs from "fs";

for (const feed of fs
  .readdirSync("static/feeds")
  .filter(file => !file.startsWith("."))) {
  try {
    const xml: any = xmlbuilder2.convert(
      fs.readFileSync(`static/feeds/${feed}`, "utf8"),
      { format: "object", wellFormed: true }
    );
    if (xml?.feed?.updated === undefined)
      throw new Error("Can’t find xml.feed.updated");
    console.log(`OK ${feed}`);
  } catch (error) {
    console.log(`ERROR ${feed}: ${error}`);
  }
}
console.log("FINISHED");
