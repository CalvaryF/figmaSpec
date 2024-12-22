// Show the UI
import design from "./expandedDesignFile" assert { type: "json" };

figma.showUI(__html__, { width: 1, height: 1 });

// Keep track of existing nodes
figma.on("run", () => {
  deleteAllNodes();
  buildFromJSONArray(design);
});

async function createOrUpdateFigmaComponent(data, parent = figma.currentPage) {
  console.log("create or update");

  let node;
  try {
    // Create the appropriate Figma node
    switch (data.type) {
      case "frame":
        node = figma.createFrame();
        break;
      case "rectangle":
        node = figma.createRectangle();
        break;
      case "text":
        node = figma.createText();
        await figma.loadFontAsync(node.fontName);
        break;
      default:
        figma.notify(`Unsupported type: ${data.type}`);
        return;
    }

    // Attach to parent
    parent.appendChild(node);

    // Update node properties
    if (data.type === "frame" || data.type === "rectangle") {
      node.resize(data.width || 100, data.height || 100);
    }

    if (data.type === "text") {
      node.characters = data.characters || "";
      node.fontSize = data.fontSize || 16;
    }

    // Set node position
    node.x = data.x || 0;
    node.y = data.y || 0;

    node.name = data.name || data.type;

    // Enable Auto Layout if specified
    if (data.autoLayout) {
      node.layoutMode = data.layoutMode || "NONE"; // "HORIZONTAL" or "VERTICAL"
      node.primaryAxisSizingMode = data.primaryAxisSizingMode || "AUTO"; // "FIXED", "AUTO", "HUG", "FILL"
      node.counterAxisSizingMode = data.counterAxisSizingMode || "AUTO"; // "FIXED", "AUTO", "HUG", "FILL"

      // Set alignment, padding, and spacing
      node.primaryAxisAlignItems = data.primaryAxisAlignItems || "MIN"; // "MIN", "CENTER", "MAX", "SPACE_BETWEEN"
      node.counterAxisAlignItems = data.counterAxisAlignItems || "MIN"; // "MIN", "CENTER", "MAX"
      node.paddingLeft = data.paddingLeft || 0;
      node.paddingRight = data.paddingRight || 0;
      node.paddingTop = data.paddingTop || 0;
      node.paddingBottom = data.paddingBottom || 0;
      node.itemSpacing = data.itemSpacing || 0; // Horizontal gap
    }

    console.log(`Node after update:`, node);

    // Handle children recursively
    if (data.hasOwnProperty("children")) {
      for (const child of data.children) {
        await createOrUpdateFigmaComponent(child, node);
      }
    }
  } catch (error) {
    console.error(`Error processing node ${data.name || data.type}:`, error);
  }
}

function logAllNodes() {
  const nodes = figma.currentPage.children;
  console.log("All nodes in the current page:");
  nodes.forEach((node) => {
    console.log(`Node ID: ${node.id}, Name: ${node.name}, Type: ${node.type}`);
  });
}

function deleteAllNodes() {
  for (const node of figma.currentPage.children) {
    node.remove();
  }
}

function buildFromJSONArray(jsonArray) {
  try {
    for (const json of jsonArray) {
      createOrUpdateFigmaComponent(json);
    }
  } catch (error) {
    console.log(`Error loading JSON array: ${error.message}`);
  }
}
