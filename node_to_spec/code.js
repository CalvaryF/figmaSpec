
/* global figma */
/* global __html__*/
figma.showUI(__html__, { width: 400, height: 600});

// Function to recursively extract node properties
function extractNodeData(node)  {
  const baseData = {
    id: node.id,
    type: node.type,
    name: node.name,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  }; 

  if ("children" in node) {
    baseData["children"] = node.children.map(extractNodeData);
  }

  return baseData;
}

// Function to handle selection change
function updateSelection() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({ type: "frame-data", payload: null });
    return;
  }

  const frame = selection[0];

  if (frame.type !== "FRAME") {
    figma.ui.postMessage({ type: "frame-data", payload: null });
    return;
  }

  const frameData = extractNodeData(frame);

  figma.ui.postMessage({ type: "frame-data", payload: frameData });
}

// Listen for selection changes
figma.on("selectionchange", updateSelection);

// Send initial message to UI
figma.ui.onmessage = (message) => {
  if (message.type === "close") {
    figma.closePlugin();
  }
};

