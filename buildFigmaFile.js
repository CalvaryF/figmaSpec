// Import design file
import design from "./expandedDesignFile" assert { type: "json" };
import styles from "./designs/styles/styles.json" assert { type: "json" };
import variables from "./designs/variables/variables.json" assert { type: "json" };

// Show the UI
figma.showUI(__html__, { width: 1, height: 1 });

// Event: Handle run
figma.on("run", async () => {
  figma.getLocalTextStyles().forEach((s) => s.remove());
  for (const style of styles) {
    const textStyle = figma.createTextStyle();
    const fontName = style.fontName;
    await figma.loadFontAsync(fontName);
    textStyle.fontName = fontName;
    Object.assign(textStyle, style.props);
  }

  // Delete all existing variables and variable collections
  const collections = figma.variables.getLocalVariableCollections();
  collections.forEach((collection) => collection.remove());

  // Create new variables
  for (const collectionData of variables.collections) {
    console.log("var creation");
    const collection = figma.variables.createVariableCollection(
      collectionData.name
    );

    // Add modes to the collection
    //restricted by figma payment tier
    for (const mode of collectionData.modes) {
      //collection.addMode(mode.name);
    }

    // Add variables to the collection
    for (const variableData of collectionData.variables) {
      console.log("var");
      const variable = figma.variables.createVariable(
        variableData.name,
        collection,
        variableData.type
      );
      const defaultModeId = collection.defaultModeId;
      variable.setValueForMode(defaultModeId, variableData.values.default);
      // Set values for each mode
    }
  }

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
      //  console.log(n.getPluginData("customId"));
      return n.getPluginData("customId") === data.id;
    });
    if (component && component.type === "COMPONENT") {
      node = component.createInstance();
    } else {
      console.error(`Component with customId "${data.id}" not found.`);
      return;
    }
  } else if (data.type === "componentSet") {
    // Build each variant as a standalone component
    const variants = [];
    for (const variant of data.variants) {
      const variantNode = await createOrUpdateFigmaComponent(variant, parent);
      if (variantNode) variants.push(variantNode);
    }
    // Combine into a single set if possible
    if (variants.length > 1) {
      console.log("variant set tried");
      node = figma.combineAsVariants(variants, parent);
      node.name =
        (data.props && data.props.name) != null
          ? data.props.name
          : "Unnamed Variant Set";
      node.setPluginData("customId", data.id);
    } else {
      console.log("fallback");
      // Fallback if there's only one variant
      node = variants[0];
    }
  } else if (data.type === "text") {
    const textNode = figma.createText();
    await figma.loadFontAsync(textNode.fontName);
    node = textNode;

    if (data.style) {
      const allTextStyles = figma.getLocalTextStyles();
      const matchingStyle = allTextStyles.find(
        (style) => style.name === data.style
      );
      node.textStyleId = matchingStyle.id;
    }
  } else {
    node = await createNodeByType(data.type);
    if (data.type === "component") {
      node.setPluginData("customId", data.id);
      // console.log(node.getPluginData("customId"));
    }
  }

  if (!node) {
    figma.notify(`Unsupported node type: ${data.type}`);
    return;
  }

  parent.appendChild(node);

  // Apply immediate props
  Object.assign(node, data.props);

  // Apply variable bindings if any
  if (data.variableProps) {
    console.log(data.variableProps);
    bindVariablesToNode(node, data.variableProps);
  }

  // If this node is a component, define its properties
  if (data.type === "component" && data.properties) {
    addComponentProperties(node, data.properties);
  }

  // Handle children recursively
  if (data.children) {
    for (const child of data.children) {
      await createOrUpdateFigmaComponent(child, node);
    }
  }
  return node;
}

function bindVariablesToNode(node, variableProps) {
  // 1) Clear existing bound variables
  removeAllBindingsDynamic(node);
  // 3) For each [propertyPath, variableName] pair, set bound variable directly
  for (const [propertyPath, variableName] of Object.entries(variableProps)) {
    const figvar = findVariableByName(variableName);
    if (figvar) {
      node.setBoundVariable(propertyPath, figvar);
    } else {
      console.warn(
        `Variable "${variableName}" not found. Skipping "${propertyPath}".`
      );
      continue;
    }
  }
}

function addComponentProperties(componentNode, properties) {
  for (const propSpec of Object.values(properties)) {
    componentNode.addComponentProperty(
      propSpec.name,
      propSpec.type,
      propSpec.defaultValue
    );
  }
}

function removeAllBindingsDynamic(node) {
  if ("getBinding" in node && "removeBinding" in node) {
    const possibleProperties = Object.keys(node); // Inspect the node's properties dynamically
    for (const property of possibleProperties) {
      try {
        if (node.getBinding(property)) {
          node.removeBinding(property);
        }
      } catch (error) {
        // Ignore errors for non-bindable properties
      }
    }
  }
}

function findVariableByName(name) {
  const allVariables = figma.variables.getLocalVariables();
  const foundVar = allVariables.find((v) => v.name === name);
  return foundVar ? foundVar : null;
}

function arrangeBaseNodes(nodes) {
  let offsetXComponent = 0;
  let offsetXOther = 0;
  let spacing = 100;
  let tallestComponentHeight = 0;
  let componentSectionHeightOffset = 30;

  // Separate nodes into components and others
  const components = nodes.filter(
    (node) => node.type === "COMPONENT" || node.type === "COMPONENT_SET"
  );
  const others = nodes.filter(
    (node) => node.type !== "COMPONENT" && node.type !== "COMPONENT_SET"
  );

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
