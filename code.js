// Show the UI
figma.showUI(__html__, { width: 600, height: 500 });

// Keep track of existing nodes
let existingNodes = {};

async function createOrUpdateFigmaComponent(data, parent = figma.currentPage) {
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

  // Handle children
  if (data.children) {
    for (const child of data.children) {
      await createOrUpdateFigmaComponent(child, node);
    }
  }
}

figma.ui.onmessage = (message) => {
  const { json, cursorId } = message;

  if (cursorId && existingNodes[cursorId]) {
    // Select the corresponding node in Figma
    figma.currentPage.selection = [existingNodes[cursorId]];
    //figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection);
    return;
  }

  try {
    const parsedJson = JSON.parse(json);
    createOrUpdateFigmaComponent(parsedJson);
  } catch (error) {
    figma.notify(`Error: ${error.message}`);
    console.error(error);
  }
};
