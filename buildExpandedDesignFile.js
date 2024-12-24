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
                components = components.concat(extractComponents(resolvedChild.children));
              }
            }
          } catch (err) {
            console.error(`Error reading or parsing $ref at ${obj["$ref"]}:`, err);
          }
        }
      });
    
      return components;
    };
    
  
    // // Second pass: Build full structure
    // const resolveStructure = (objArray) => {
    //   return objArray.map((obj) => {
    //     // Recursively resolve children
    //     if (Array.isArray(obj.children)) {
    //       obj.children = resolveStructure(obj.children); // Recurse
    //     }
    
    //     // Handle $ref
    //     if (obj["$ref"]) {
    //       console.log("ref");
    //       const refPath = obj["$ref"];
    //       try {
    //         if (!resolvedRefs.has(refPath)) {
    //           // Read and parse the referenced object
    //           const refData = fs.readFileSync(refPath, "utf8");
    //           const resolvedObject = JSON.parse(refData);
    
    //           // Mark the reference as resolved
    //           resolvedRefs.add(refPath);
    
    //           // Replace the $ref object with the resolved object
    //           return resolveStructure([resolvedObject])[0]; // Resolve its structure
    //         }
    //       } catch (err) {
    //         console.error(`Error reading or resolving $ref at ${refPath}:`, err);
    //       }
    //     }
    
    //     return obj; // Return the object as is if no $ref is found
    //   });
    // };
    const fs = require("fs");

    const resolveStructure = (objArray) => {
      console.log("resolve refs");
      if (!Array.isArray(objArray)) return objArray; // Handle non-array inputs gracefully
    
      return objArray.map((obj) => {
        // Recursively resolve children
        if (Array.isArray(obj.children)) {
          obj.children = obj.children.map((child) => {
            if (child["$ref"]) {
              const refPath = child["$ref"];
              try {
                // Read and parse the referenced file
                const refData = fs.readFileSync(refPath, "utf8");
                const resolvedChild = JSON.parse(refData);
    
                // Replace $ref object with resolved data and change type to "instance"
                return {
                  ...resolveStructure([resolvedChild])[0], // Ensure nested $refs are resolved
                  type: "componentInstance",
                };
              } catch (refErr) {
                console.error(
                  `Error reading or parsing $ref file at ${refPath}:`,
                  refErr
                );
                return child; // Return the original child if there's an error
              }
            }
            return child; // Return child unchanged if no $ref
          });
        }
        return obj; // Return object unchanged if no $ref in children
      });
    };
    
  
    // Process: Extract components, then build structure
    const extractedArray = resolveStructure(extractComponents(objArray)).reverse();
    const structuredArray = resolveStructure(objArray);
  
    return [...extractedArray];
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
