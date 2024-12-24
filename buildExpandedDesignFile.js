const fs = require("fs");

// Read JSON from layout.json
fs.readFile("designs/layout/layout.json", "utf8", (err, data) => {
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
    // const extractComponents = (objArray) => {
    //   let components = [];

    //   objArray.forEach((obj) => {
    //     // Add components to the flat array
    //     if (obj.type === "component") {
    //       resolvedRefs.add(obj.id);
    //       components.push(obj);
    //     }

    //     // Recurse into children if present
    //     if (Array.isArray(obj.children)) {
    //       components = components.concat(extractComponents(obj.children));
    //     }
    //     // if (Array.isArray(obj.variants)) {
    //     //   components = components.concat(extractComponents(obj.variants));
    //     // }

    //     // Resolve $ref and process the resolved object
    //     if (obj["$ref"]) {
    //       try {
    //         const refPath = obj["$ref"];
    //         if (!resolvedRefs.has(refPath)) {
    //           const refData = fs.readFileSync(refPath, "utf8");
    //           const resolvedChild = JSON.parse(refData);

    //           if (
    //             resolvedChild.type === "component" ||
    //             resolvedChild.type === "componentSet"
    //           ) {
    //             resolvedRefs.add(refPath);
    //             components.push(resolvedChild);
    //           }

    //           // Recurse into children of the resolved object
    //           if (Array.isArray(resolvedChild.children)) {
    //             components = components.concat(
    //               extractComponents(resolvedChild.children)
    //             );
    //           }
    //         }
    //       } catch (err) {
    //         console.error(
    //           `Error reading or parsing $ref at ${obj["$ref"]}:`,
    //           err
    //         );
    //       }
    //     }
    //   });

    //   return components;
    // };

    function extractComponents(objArray, visitedRefsParam, visitedIdsParam) {
      const visitedRefs =
        visitedRefsParam instanceof Set ? visitedRefsParam : new Set();
      const visitedIds =
        visitedIdsParam instanceof Set ? visitedIdsParam : new Set();
      let components = [];

      objArray.forEach((obj) => {
        // Descend into children first
        if (Array.isArray(obj.children)) {
          components = components.concat(
            extractComponents(obj.children, visitedRefs, visitedIds)
          );
        }

        // Resolve $ref, then process resolved children/components
        if (obj["$ref"]) {
          const refPath = obj["$ref"];
          if (!visitedRefs.has(refPath)) {
            try {
              const refData = fs.readFileSync(refPath, "utf8");
              const resolved = JSON.parse(refData);

              visitedRefs.add(refPath);

              if (Array.isArray(resolved.children)) {
                components = components.concat(
                  extractComponents(resolved.children, visitedRefs, visitedIds)
                );
              }

              if (
                (resolved.type === "component" ||
                  resolved.type === "componentSet") &&
                !visitedIds.has(resolved.id)
              ) {
                visitedIds.add(resolved.id);
                components.push(resolved);
              }
            } catch (err) {
              console.error(`Error reading/parsing $ref at ${refPath}:`, err);
            }
          }
        }

        // After children/$ref, record component
        if (obj.type === "component" && !visitedIds.has(obj.id)) {
          visitedIds.add(obj.id);
          components.push(obj);
        }
      });

      return components;
    }

    // function extractComponents(objArray) {
    //   const components = [];
    //   const queue = [...objArray];

    //   while (queue.length) {
    //     const current = queue.shift();

    //     // Check if this is a component
    //     if (current.type === "component") {
    //       resolvedRefs.add(current.id);
    //       components.push(current);
    //     }

    //     // Enqueue children for BFS
    //     if (Array.isArray(current.children)) {
    //       queue.push(...current.children);
    //     }

    //     // Check for reference
    //     if (current["$ref"]) {
    //       const refPath = current["$ref"];
    //       if (!resolvedRefs.has(refPath)) {
    //         try {
    //           const refData = fs.readFileSync(refPath, "utf8");
    //           const resolvedChild = JSON.parse(refData);

    //           // If the resolved child is a component or set, add to result
    //           if (
    //             resolvedChild.type === "component" ||
    //             resolvedChild.type === "componentSet"
    //           ) {
    //             resolvedRefs.add(refPath);
    //             components.push(resolvedChild);
    //           }

    //           // Enqueue children of the resolved object
    //           if (Array.isArray(resolvedChild.children)) {
    //             queue.push(...resolvedChild.children);
    //           }
    //         } catch (error) {
    //           console.error(
    //             `Error reading or parsing $ref at ${refPath}:`,
    //             error
    //           );
    //         }
    //       }
    //     }
    //   }

    //   return components;
    // }

    function resolveStructure(obj, selectVariants) {
      if (!Array.isArray(obj)) return obj;

      return obj.map((node) => {
        if (node.$ref) {
          try {
            const data = fs.readFileSync(node.$ref, "utf8");
            const parsed = JSON.parse(data);

            if (parsed.type === "component") {
              if (parsed.props) delete parsed.props;
              if (parsed.children) delete parsed.children;
              return {
                ...parsed,
                type: "componentInstance",
              };
            }
          } catch (err) {
            console.error("Error reading/parsing ref:", err);
            return node;
          }
        }

        if (Array.isArray(node.children)) {
          node.children = resolveStructure(node.children);
        }

        if (Array.isArray(node.variants)) {
          node.variants = resolveStructure(node.variants);
        }

        return node;
      });
    }

    // Process: Extract components, then build structure
    const extractedComponents = resolveStructure(
      extractComponents(objArray, true)
    );
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
