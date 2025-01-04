// Import design file
import design from "./expandedDesignFile";
import styles from "./designs/styles/styles.json";
import variables from "./designs/variables/variables.json";
/* global figma */
/* global __html__ */


// Show the UI
figma.showUI(__html__, { width: 1, height: 1 });

// Event: Handle run
figma.on("run", async () => {
	console.log("-----");
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
		console.log("varrrr creation");
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

async function createOrUpdateFigmaComponent(
	data,
	parent = figma.currentPage,
	ancestorComponents = [] // Track component ancestors
) {
	let node;

	if (data.type === "componentInstance") {
		const component = figma.currentPage.findOne((n) => {
			return n.getPluginData("customId") === data.id;
		});
		if (component && component.type === "COMPONENT") {
			node = component.createInstance();
		} else {
			console.error(`Component with customId "${data.id}" not found.`);
			return;
		}
	} else if (data.type === "componentSet") {
		const variants = [];
		for (const variant of data.variants) {
			const variantNode = await createOrUpdateFigmaComponent(
				variant,
				parent,
				ancestorComponents
			);
			if (variantNode) variants.push(variantNode);
		}
		if (variants.length > 1) {
			node = figma.combineAsVariants(variants, parent);
			node.name =
				(data.props && data.props.name) != null
				? data.props.name
				: "Unnamed Variant Set";
			node.setPluginData("customId", data.id);
		} else {
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
		}
	}

	if (!node) {
		figma.notify(`Unsupported node type: ${data.type}`);
		return;
	}

	parent.appendChild(node);
	Object.assign(node, data.props);

	if (data.variableProps) {
		bindVariablesToNode(node, data.variableProps);
	}

	// Track component ancestors
	const currentAncestors = [...ancestorComponents];
	if (data.type === "component") {
		currentAncestors.push({
			node,
			id: data.id,
			properties: data.properties || [],
		});
	}

	// Set up component properties
	if (data.type === "component" && data.properties) {
		for (const prop of data.properties) {
			await node.addComponentProperty(prop.name, prop.type, prop.defaultValue);
		}
	}

	// Handle children recursively
	if (data.children) {
		for (const child of data.children) {
			await createOrUpdateFigmaComponent(child, node, currentAncestors);
		}
	}

	// Handle bindings
	if (data.bindings) {
		for (const binding of data.bindings) {
			let targetComponent = null;

			// Find the target component that owns the property
			if (binding.componentId) {
				const foundAncestor = currentAncestors.find(function (ancestor) {
					return ancestor.id === binding.componentId;
				});
				if (foundAncestor) {
					targetComponent = foundAncestor.node;
				} else {
					console.warn(
						`Could not find an anscestor node with id ${binding.componentId}`
					);
				}
			}

			if (targetComponent) {
				console.log("target component");
				try {
					// Find the matching property key from component definitions
					const definitions = targetComponent.componentPropertyDefinitions;
					let matchingKey = null;
					// Look through all property definitions to find matching name
					Object.keys(definitions).forEach(function (key) {
						// Extract the name part before the @ symbol
						const namePart = key.split("#")[0];
						if (namePart === binding.name) {
							matchingKey = key;
						}
					});

					if (matchingKey) {
						var bindingObject = {};
						bindingObject[binding.attribute] = matchingKey;
						node.componentPropertyReferences = bindingObject;
						console.log("Set property reference:", bindingObject);
					} else {
						console.warn(
							'Could not find matching property definition for "' +
							binding.name +
							'"'
						);
					}
				} catch (error) {
					console.error(
						'Failed to bind property "' +
						binding.name +
						'" to attribute "' +
						binding.attribute +
						'"',
						error
					);
				}
			} else {
				console.warn(
					'Could not find target component for binding "' + binding.name + '"'
				);
			}
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
	const spacing = 100;
	let tallestComponentHeight = 0;
	const componentSectionHeightOffset = 30;

	// Separate nodes into components vs. others
	const components = nodes.filter(
		(node) => node.type === "COMPONENT" || node.type === "COMPONENT_SET"
	);
	const others = nodes.filter(
		(node) => node.type !== "COMPONENT" && node.type !== "COMPONENT_SET"
	);

	// Create a section node for components
	const componentSection = figma.createSection();
	let totalComponentWidth = 0;

	// Arrange components in a row
	for (const component of components) {
		// If it’s a component set, arrange child variants horizontally first
		if (component.type === "COMPONENT_SET") {
			let variantOffset = 0;
			let maxVariantHeight = 0;

			// Position each variant side by side
			for (const variantNode of component.children) {
				variantNode.x = variantOffset + spacing / 4;
				variantOffset += variantNode.width + spacing / 4;
				variantNode.y += +spacing / 4;
				if (variantNode.height > maxVariantHeight) {
					maxVariantHeight = variantNode.height;
				}
			}

			// Resize the component set to fit total variant width + max variant height
			component.resizeWithoutConstraints(
				variantOffset - spacing / 4 + spacing / 2,
				maxVariantHeight + spacing / 2
			);
			component.strokes = [
				{
					type: "SOLID",
					color: { r: 151 / 255, g: 71 / 255, b: 255 / 255 },
				},
			];
			component.strokeWeight = 1;
			component.dashPattern = [16, 8];
			component.strokeAlign = "CENTER";
		}

		// Now position this component / component set in the row
		component.x = offsetXComponent + spacing / 2;
		component.y = spacing / 2 + componentSectionHeightOffset;
		offsetXComponent += component.width + spacing;

		// Move component under section
		componentSection.appendChild(component);

		// Track tallest in this row
		if (component.height > tallestComponentHeight) {
			tallestComponentHeight = component.height;
		}

		// Track total used width (minus last spacing)
		totalComponentWidth = offsetXComponent - spacing;
	}

	// Resize the section to fit all components
	componentSection.resizeWithoutConstraints(
		totalComponentWidth + spacing,
		tallestComponentHeight + spacing + componentSectionHeightOffset
	);
	componentSection.name = "Components";
	componentSection.x = 0;
	componentSection.y = 0;

	// Arrange all non-components below
	for (const other of others) {
		other.x = offsetXOther;
		other.y =
			spacing + tallestComponentHeight + spacing + componentSectionHeightOffset;
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
