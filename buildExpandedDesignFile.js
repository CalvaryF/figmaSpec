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

  const resolveRefs = (objArray, resolvedRefs = new Set()) => {
    // First pass: Extract components and add to base array
    const extractComponents = (objArray) => {
      let components = [];

      objArray.forEach((obj) => {
        // Add components to the flat array
        if (obj.type === "component") {
          resolvedRefs.add(obj.id);
          components.push(obj);
        }

        // Recurse into children if present
        if (Array.isArray(obj.children)) {
          components = components.concat(extractComponents(obj.children));
        }

        // Resolve $ref and process the resolved object
        if (obj["$ref"]) {
          try {
            const refPath = obj["$ref"];
            if (!resolvedRefs.has(refPath)) {
              const refData = fs.readFileSync(refPath, "utf8");
              const resolvedChild = JSON.parse(refData);

              if (resolvedChild.type === "component") {
                resolvedRefs.add(refPath);
                components.push(resolvedChild);
              }

              // Recurse into children of the resolved object
              if (Array.isArray(resolvedChild.children)) {
                components = components.concat(
                  extractComponents(resolvedChild.children)
                );
              }
            }
          } catch (err) {
            console.error(
              `Error reading or parsing $ref at ${obj["$ref"]}:`,
              err
            );
          }
        }
      });

      return components;
    };

    function resolveStructure(obj) {
      if (!Array.isArray(obj)) return obj;

      return obj.map((node) => {
        if (node.$ref) {
          try {
            const data = fs.readFileSync(node.$ref, "utf8");
            const parsed = JSON.parse(data);

            if (parsed.type === "component") {
              if (parsed.props) delete parsed.props;
              if (parsed.children) delete parsed.children;
            }

            return {
              ...parsed,
              type: "componentInstance",
            };
          } catch (err) {
            console.error("Error reading/parsing ref:", err);
            return node;
          }
        }

        if (Array.isArray(node.children)) {
          node.children = resolveStructure(node.children);
        }

        return node;
      });
    }

    // Process: Extract components, then build structure
    const extractedComponents = resolveStructure(
      extractComponents(objArray)
    ).reverse();
    const structuredArray = resolveStructure(objArray);

    return [...extractedComponents, ...structuredArray];
  };

  layout = resolveRefs(layout);

  // Write resolved JSON to file1.json
  fs.writeFile(
    "./expandedDesignFile.json",
    JSON.stringify(layout, null, 2),
    (err) => {
      if (err) {
        console.error("Error writing to output file:", err);
        return;
      }
      console.log("JSON data successfully written to file1.json");
    }
  );
});
