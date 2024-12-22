const fs = require("fs");

console.log("Hello.js script started...");

// Read JSON from layout.json
fs.readFile("designs/layout/layout.json", "utf8", (err, data) => {
  console.log("building file");
  if (err) {
    console.error("Error reading input file:", err);
    return;
  }

  let layout;
  try {
    layout = JSON.parse(data);
  } catch (parseErr) {
    console.error("Error parsing JSON:", parseErr);
    return;
  }

  // Resolve $ref in children
  const resolveRefs = (objArray) => {
    console.log("resolve refs");
    if (Array.isArray(objArray)) {
      return objArray.map((obj) => {
        if (Array.isArray(obj.children)) {
          obj.children = obj.children.map((child) => {
            if (child["$ref"]) {
              const refPath = child["$ref"];
              try {
                const refData = fs.readFileSync(refPath, "utf8");
                return JSON.parse(refData);
              } catch (refErr) {
                console.error(
                  `Error reading or parsing ref file ${refPath}:`,
                  refErr
                );
                return child;
              }
            }
            return child;
          });
        }
        return obj;
      });
    }
    return objArray;
  };

  layout = resolveRefs(layout);

  // Write resolved JSON to file1.json
  fs.writeFile("./displayFile.json", JSON.stringify(layout, null, 2), (err) => {
    if (err) {
      console.error("Error writing to output file:", err);
      return;
    }
    console.log("JSON data successfully written to file1.json");
  });
});
