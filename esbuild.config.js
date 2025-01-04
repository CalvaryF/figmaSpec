import esbuild from "esbuild";
import fs from "fs";
import { runScript } from "./utils.js"; // Assume utils.js for shared utilities
import path from "path";
import chokidar from "chokidar";

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
function watchAdditionalFiles(context, dir) {
  console.log("watch called");

  const watcher = chokidar.watch(dir, {
    persistent: true,
    ignoreInitial: true, // Skip initial add events
    usePolling: true, // Necessary for compatibility with tools like nvim
    interval: 100, // Adjust the polling interval if needed
  });

  watcher
    .on("change", async (filePath) => {
      console.log(`File changed: ${filePath}`);
      try {
        await context.rebuild();
        console.log("Rebuild completed.");
      } catch (error) {
        console.error(`Rebuild failed: ${error.message}`);
      }
    })
    .on("error", (error) => {
      console.error(`Watcher error: ${error.message}`);
    });

  console.log(`Watching directory: ${dir}`);
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
    console.log("watching");
    watchAdditionalFiles(context, additionalFiles);
  }
}

// Main Build Script
const preBuildPlugin = createPreBuildPlugin("buildExpandedDesignFile.js");
const additionalFilesToWatch = "./designs";

buildWithPlugins(
  ["buildFigmaFile.js"],
  "dist/bundle.js",
  [preBuildPlugin],
  additionalFilesToWatch
).catch(() => process.exit(1));
