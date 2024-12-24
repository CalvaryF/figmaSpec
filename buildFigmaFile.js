// Import design file
import design from "./expandedDesignFile" assert { type: "json" };

// Show the UI
figma.showUI(__html__, { width: 1, height: 1 });

// Event: Handle run
figma.on("run", async () => {
  figma.currentPage.children.forEach((n) => n.remove());

  // Create everything
  for (const item of design) {
    await createOrUpdateFigmaComponent(item);
  }

  // Arrange top-level nodes
  arrangeBaseNodes(figma.currentPage.children);
});

async function createOrUpdateFigmaComponent(data, parent = figma.currentPage) {
  let node;

  if (data.type === "componentInstance") {
    // Resolve component by custom ID stored in pluginData
    const component = figma.currentPage.findOne((n) => {
      console.log(n.getPluginData("customId"));
      return n.getPluginData("customId") === data.id;
    });
    if (component && component.type === "COMPONENT") {
      node = component.createInstance();
    } else {
      console.error(`Component with customId "${data.id}" not found.`);
      return;
    }
  } else {
    node = await createNodeByType(data.type);
    if (data.type === "component") {
      node.setPluginData("customId", data.id);
      console.log(node.getPluginData("customId"));
    }
  }

  if (!node) {
    figma.notify(`Unsupported node type: ${data.type}`);
    return;
  }

  parent.appendChild(node);

  // Apply properties
  Object.assign(node, data.props);

  // Handle children recursively
  if (data.children) {
    for (const child of data.children) {
      await createOrUpdateFigmaComponent(child, node);
    }
  }
}

function arrangeBaseNodes(nodes) {
  let offsetX = 0;
  let spacing = 100;
  for (const node of nodes) {
    node.x = offsetX;
    node.y = 0;
    offsetX += node.width + spacing;
  }
}

async function createNodeByType(type) {
  switch (type) {
    case "component":
      return figma.createComponent();
    case "frame":
      return figma.createFrame();
    case "rectangle":
      return figma.createRectangle();
    case "text":
      const textNode = figma.createText();
      await figma.loadFontAsync(textNode.fontName);
      return textNode;
    default:
      return null;
  }
}
