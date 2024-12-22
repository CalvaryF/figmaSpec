const fs = require("fs");

console.log("Hello.js script started...");

// Read JSON from layout.json
fs.readFile("designs/layout/layout.json", "utf8", (err, data) => {
  if (err) {
    console.error("Error reading input file:", err);
    return;
  }

  // Write JSON to file1.json
  fs.writeFile("designs/file1.json", data, (err) => {
    if (err) {
      console.error("Error writing to output file:", err);
      return;
    }
    console.log("JSON data successfully written to file1.json");
  });
});
