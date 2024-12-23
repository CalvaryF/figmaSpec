// Import design file
import design from "./expandedDesignFile" assert { type: "json" };

// Show the UI
figma.showUI(__html__, { width: 1, height: 1 });

// Event: Handle run
figma.on("run", () => {
  figma.currentPage.children.forEach((node) => node.remove());
  design.forEach((json) => createOrUpdateFigmaComponent(json));
});

async function createOrUpdateFigmaComponent(data, parent = figma.currentPage) {
  let node;

  if (data.type === "componentInstance") {
    // Resolve component by custom ID stored in pluginData
    const component = figma.currentPage.findOne(

      (n) => {
        console.log(n.getPluginData("customId")); 
        console.log(data.id);
        return n.getPluginData("customId") === data.componentId
      }
    );

    if (component && component.type === "COMPONENT") {
      node = component.createInstance();
    } else {
      console.error(`Component with customId "${data.componentId}" not found.`);
      return;
    }
  } else {
    node = await createNodeByType(data.type);
    if (data.type === "component") {
      node.setPluginData("customId", data.id);
    }
  }

  if (!node) {
    figma.notify(`Unsupported node type: ${data.type}`);
    return;
  }

  parent.appendChild(node);
  node.name = data.name || node.name;

  // Apply properties
  Object.assign(node, data.props);

  // Handle children recursively
  if (data.children) {
    for (const child of data.children) {
      await createOrUpdateFigmaComponent(child, node);
    }
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