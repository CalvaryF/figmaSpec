import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { runScript } from "./utils.js"; // Ensure the correct path and extension

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
  const watchFiles = (dir) => {
    console.log(dir);
    fs.readdir(dir, { withFileTypes: true }, (err, files) => {
      console.log("reading");
      if (err) {
        console.error(`Error reading directory ${dir}:`, err);
        return;
      }
      files.forEach((file) => {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          watchFiles(fullPath); // Recursively watch subdirectories
        } else {
          fs.watch(fullPath, async (eventType) => {
            if (eventType === "change") {
              console.log(`File changed: ${fullPath}`);
              try {
                await context.rebuild();
                console.log("Rebuild completed.");
              } catch (error) {
                console.error(`Rebuild failed: ${error.message}`);
              }
            }
          });
        }
      });
    });
  };

  watchFiles(dir);
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
