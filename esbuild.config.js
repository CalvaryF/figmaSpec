const esbuild = require("esbuild");

async function build() {
  const context = await esbuild.context({
    entryPoints: ["code.js"], // Replace with your files
    bundle: true,

    outfile: "dist/bundle.js", // Output file
    minify: false, // Set to true if you want to minify
    sourcemap: true, // Optional, for debugging
  });

  // Enable watch mode
  await context.watch();
  console.log("Watching for changes...");
}

build().catch(() => process.exit(1));
