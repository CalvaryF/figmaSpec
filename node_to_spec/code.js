
/* global figma */
/* global __html__*/
figma.showUI(__html__, { width: 400, height: 600});

// Function to recursively extract node properties
function extractNodeData(node) {
    const baseData = {};
    const properties = [
        "id", 
        "type", 
        "name", 
        "x", 
        "y", 
        "width", 
        "height", 
        "minWidth",
        "maxWidth",
        "minHeight",
        "maxHeight",
        "relativeTransform",
        "absoluteTransform",
        "absoluteBoundingBox",
        "layoutAlign",
        "constrainProportions",
        "rotation",
        "layoutSizingHorizontal",
        "layoutSizingVertical",
        "layoutGrow",
        "layoutMode", 
        "paddingBottom",
        "constraints",
        "paddingLeft", 
        "paddingRight",
        "paddingTop",
        "layoutPositioning",
        "horizontalPadding",
        "verticalPadding",
        "primaryAxisSizingMode",
        "counterAxisSizingMode",
        "primaryAxisAlignItems",
        "counterAxisAlignItems",
        "counterAxisAlignContent",
        "itemSpacing",
        "counterAxisSpacing",
        "itemReverseZIndex",
        "strokesIncludedInLayout",
        "fills", 
        "textAlignHorizontal",
        "textAlignVertical",
        "textAutoResize",
        "textTruncation",
        "maxLines",
        "paragraphIndent",
        "paragraphSpacing",
        "listSpacing",
        "characters",
        "hangingPunctuation",
        "hangingList",
        "fontSize",
        "fontName",
        "fontWeight",
        "textCase",
        "textDecoration",
        "textDecorationStyle",
        "textDecorationOffset",
        "textDecorationThickness",
        "textDecorationColor",
        "textDecorationSkipInk",
        "letterSpacing",
        "lineHeight",
        "visible",
        "leadingTrim",
        "textStyleId",
        "locked",
        "opacity",
        "blendMode",
        "isMask",
        "maskType",
        "effects",
        "effectStyleId",
        "fillStyleId",
        "strokes",
        "strokeStyleId",
        "strokeWeight",
        "strokeJoin",
        "strokeAlign",
        "dashPattern",
        "strokeGeometry",
        "strokeCap",
        "strokeMiterLimit",
        "cornerRadius",
        "cornerSmoothing",
        "strokeTopWeight",
        "strokeBottomWeight",
        "strokeLeftWeight",
        "strokeRightWeight",
        "layoutGrids",
        "gridStyleId",
        "clipsContent",
        "guides",
        "layoutWrap",
        "overflowDirection"





    ];
    console.log(node);

    console.log(Object.keys(node));
    Object.getOwnPropertyNames(node);
    // Copy only the desired properties
    properties.forEach(prop => {
        if (prop in node) {
            baseData[prop] = node[prop];
    }
  });

  // Handle children if present
  if ("children" in node) {
    baseData.children = node.children.map(extractNodeData);
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
//
//  if (frame.type !== "FRAME") {
//    figma.ui.postMessage({ type: "frame-data", payload: null });
//    return;
//  }

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

