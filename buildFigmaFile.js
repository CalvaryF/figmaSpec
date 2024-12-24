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
  let offsetXComponent = 0;
  let offsetXOther = 0;
  let spacing = 100;
  let tallestComponentHeight = 0;
  let componentSectionHeightOffset = 30;

  // Separate nodes into components and others
  const components = nodes.filter((node) => node.type === "COMPONENT");
  const others = nodes.filter((node) => node.type !== "COMPONENT");

  // Create a section node for components
  const componentSection = figma.createSection();

  // Track total width for the section
  let totalComponentWidth = 0;

  // Arrange components in the upper row and add to the section
  for (const component of components) {
    component.x = offsetXComponent + spacing / 2;
    component.y = spacing / 2 + componentSectionHeightOffset; // Top row within the section
    offsetXComponent += component.width + spacing;

    // Add the component to the section
    componentSection.appendChild(component);

    // Update the tallest component height
    if (component.height > tallestComponentHeight) {
      tallestComponentHeight = component.height;
    }

    // Update total width for the section
    totalComponentWidth = offsetXComponent - spacing; // Subtract extra spacing after the last component
  }

  // Adjust section size to fit components
  componentSection.resizeWithoutConstraints(
    totalComponentWidth + spacing,
    tallestComponentHeight + spacing + componentSectionHeightOffset
  );
  componentSection.name = "Components";

  // Position the section on the canvas
  componentSection.x = 0; // Adjust as needed
  componentSection.y = 0; // Adjust as needed

  // Arrange other nodes in the lower row
  for (const other of others) {
    other.x = offsetXOther;
    other.y =
      spacing + tallestComponentHeight + spacing + componentSectionHeightOffset; // Below the tallest component
    offsetXOther += other.width + spacing;
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
