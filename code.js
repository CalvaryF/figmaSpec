// Show the UI
// figma.showUI(__html__, { width: 1, height: 1 });

// Keep track of existing nodes
let existingNodes = {};

async function createOrUpdateFigmaComponent(data, parent = figma.currentPage) {
  console.log("create or update");
  // Check if the node still exists
  if (existingNodes[data.id] && !figma.getNodeById(existingNodes[data.id].id)) {
    delete existingNodes[data.id]; // Remove invalid reference
  }

  let node = existingNodes[data.id];

  if (!node) {
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
    existingNodes[data.id] = node;
    parent.appendChild(node);
  }

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

  // Handle children
  if (data.children) {
    for (const child of data.children) {
      await createOrUpdateFigmaComponent(child, node);
    }
  }
}

figma.on("run", () => {
  deleteAllNodes();
  buildFromJSON(design);
});

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
    existingNodes = {};
    console.log("json is", json);
    console.log("parsed JSON is", json);

    createOrUpdateFigmaComponent(json);
    logAllNodes();
    figma.notify("JSON file loaded and applied!");
    console.log("JSON file updated!");
  } catch (error) {
    console.log(`Error loading JSON: ${error.message}`);
    figma.notify(`Error loading JSON: ${error.message}`);
  }
}

const design = {
  id: "root2",
  type: "frame",
  name: "Main Frame",
  width: 100,
  height: 400,
  children: [
    {
      id: "aa",
      type: "rectangle",
      name: "Rectangle",
      width: 100,
      height: 100,
    },
    {
      id: "aaa",
      type: "text",
      name: "Text Node",
      characters: "Hello, Figma!",
      fontSize: 24,
    },
  ],
};
