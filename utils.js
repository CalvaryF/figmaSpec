import { exec } from "child_process";

/**
 * Executes a given script asynchronously.
 * @param {string} scriptPath - Path to the script to execute.
 * @returns {Promise<void>} Resolves when the script completes, rejects on error.
 */
export function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    exec(`node ${scriptPath}`, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`Error executing ${scriptPath}: ${err.message}`));
        return;
      }
      if (stdout) console.log(stdout.trim());
      if (stderr) console.error(stderr.trim());
      resolve();
    });
  });
}
