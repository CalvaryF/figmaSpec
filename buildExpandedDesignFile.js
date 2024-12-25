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

    function extractComponents(
      objArray,
      visitedRefsParam,
      visitedIdsParam,
      parentType
    ) {
      console.log("extract");
      const visitedRefs =
        visitedRefsParam instanceof Set ? visitedRefsParam : new Set();
      const visitedIds =
        visitedIdsParam instanceof Set ? visitedIdsParam : new Set();
      let components = [];

      objArray.forEach((obj) => {
        //console.log(obj.variants);
        // Descend into children first
        if (Array.isArray(obj.children)) {
          components = components.concat(
            extractComponents(obj.children, visitedRefs, visitedIds, obj.type)
          );
        }

        // Resolve $ref, then process resolved children/components
        if (obj["$ref"]) {
          console.log("ref");
          const refPath = obj["$ref"];
          if (!visitedRefs.has(refPath)) {
            try {
              const refData = fs.readFileSync(refPath, "utf8");
              const resolved = JSON.parse(refData);

              visitedRefs.add(refPath);

              if (Array.isArray(resolved.children)) {
                components = components.concat(
                  extractComponents(
                    resolved.children,
                    visitedRefs,
                    visitedIds,
                    resolved.type
                  )
                );
              }
              if (Array.isArray(resolved.variants)) {
                console.log("inner variants");
                console.log(resolved.type);
                components = components.concat(
                  extractComponents(
                    resolved.variants,
                    visitedRefs,
                    visitedIds,
                    resolved.type
                  )
                );
              }

              if (
                (resolved.type === "component" ||
                  resolved.type === "componentSet") &&
                !visitedIds.has(resolved.id) &&
                parentType !== "componentSet"
              ) {
                console.log("parent type");
                console.log(parentType);
                console.log(resolved);
                visitedIds.add(resolved.id);
                components.push(resolved);
              }
            } catch (err) {
              console.error(`Error reading/parsing $ref at ${refPath}:`, err);
            }
          }
        }

        // After children/$ref, record component
        if (
          obj.type === "component" &&
          !visitedIds.has(obj.id) &&
          parentType !== "componentSet"
        ) {
          visitedIds.add(obj.id);
          components.push(obj);
        }
      });

      return components;
    }

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
