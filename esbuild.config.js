const esbuild = require("esbuild");
const fs = require("fs");
const { runScript } = require("./utils"); // Assume utils.js for shared utilities

// Plugin to run a script before build
function createPreBuildPlugin(scriptPath) {
  return {
    name: "pre-build-plugin",
    setup(build) {
      build.onStart(async () => {
        console.log(`Running pre-build script: ${scriptPath}`);
        try {
          await runScript(scriptPath);
          console.log("Pre-build script completed.");
        } catch (error) {
          console.error(`Pre-build script failed: ${error.message}`);
        }
      });
    },
  };
}

// Watch additional files and trigger rebuild
function watchAdditionalFiles(context, filesToWatch) {
  filesToWatch.forEach((file) => {
    fs.watch(file, async (eventType) => {
      if (eventType === "change") {
        console.log(`File changed: ${file}`);
        try {
          await context.rebuild(); // Trigger the rebuild
          console.log("Rebuild completed.");
        } catch (error) {
          console.error(`Rebuild failed: ${error.message}`);
        }
      }
    });
  });
}

// Build function with plugins
async function buildWithPlugins(
  entryPoints,
  outFile,
  plugins = [],
  additionalFiles = []
) {
  const context = await esbuild.context({
    entryPoints,
    bundle: true,
    outfile: outFile,
    minify: false,
    sourcemap: true,
    format: "esm",
    loader: { ".json": "json" },
    plugins,
  });

  // Watch mode
  await context.watch();
  console.log("Watching for changes...");

  // Watch additional files
  if (additionalFiles.length > 0) {
    watchAdditionalFiles(context, additionalFiles);
  }
}

// Main Build Script
const preBuildPlugin = createPreBuildPlugin("buildDesignFile.js");
const additionalFilesToWatch = ["./designs/layout/layout.json"];

buildWithPlugins(
  ["code.js"],
  "dist/bundle.js",
  [preBuildPlugin],
  additionalFilesToWatch
).catch(() => process.exit(1));
