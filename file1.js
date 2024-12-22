// Show the UI
figma.showUI(__html__, { width: 1, height: 1 });

// Keep track of existing nodes
figma.on("run", () => {
  deleteAllNodes();
  buildFromJSON(design);
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

    node.name = data.name || data.type;

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

function buildFromJSON(json) {
  try {
    createOrUpdateFigmaComponent(json);
  } catch (error) {
    console.log(`Error loading JSON: ${error.message}`);
  }
}

const design = {
  id: "root2",
  type: "frame",
  name: "Main Frame",
  width: 400,
  height: 1000,
  children: [
    {
      id: "aa",
      type: "rectangle",
      name: "Rectangle",
      width: 100,
      height: 400,
    },
    {
      id: "aaa",
      type: "text",
      name: "Text Node",
      characters: "Hello, Figma aklsdfjh!",
      fontSize: 24,
    },
  ],
};
