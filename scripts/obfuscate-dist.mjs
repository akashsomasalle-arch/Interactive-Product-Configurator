import { spawn } from "node:child_process";
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import JavaScriptObfuscator from "javascript-obfuscator";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");

const SKIP = [/preload-helper/i];
const LIGHT = [/jsx-runtime/i, /react-three-fiber/i, /ScenePost/i];

const shared = {
  compact: true,
  simplify: true,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  renameProperties: false,
  transformObjectKeys: false,
  ignoreImports: true,
  sourceMap: false,
  sourceMapMode: "separate",
  target: "browser",
  unicodeEscapeSequence: false,
  reservedNames: ["^__vite", "^__tla"],
};

const lightOptions = {
  ...shared,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.5,
  splitStrings: false,
  numbersToExpressions: false,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  disableConsoleOutput: true,
  selfDefending: false,
  debugProtection: false,
};

const fullOptions = {
  ...shared,
  stringArray: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayThreshold: 0.75,
  stringArrayIndexShift: true,
  stringArrayIndexesType: ["hexadecimal-number"],
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayEncoding: ["base64"],
  splitStrings: true,
  splitStringsChunkLength: 8,
  numbersToExpressions: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.35,
  deadCodeInjection: false,
  disableConsoleOutput: true,
  selfDefending: false,
  debugProtection: false,
};

function run(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, OBFUSCATE: "1" },
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? walk(path) : path;
    }),
  );
  return files.flat();
}

function optionsFor(file) {
  if (LIGHT.some((pattern) => pattern.test(file))) return { label: "light", options: lightOptions };
  return { label: "full", options: fullOptions };
}

async function obfuscateDist() {
  const files = await walk(DIST);
  const maps = files.filter((file) => file.endsWith(".map"));
  const scripts = files.filter((file) => extname(file) === ".js");

  for (const map of maps) {
    await unlink(map);
    console.log(`removed ${relative(ROOT, map)}`);
  }

  for (const file of scripts) {
    const name = relative(ROOT, file);
    if (SKIP.some((pattern) => pattern.test(file))) {
      console.log(`skipped ${name}`);
      continue;
    }

    const { label, options } = optionsFor(file);
    console.log(`obfuscating (${label}) ${name}`);
    const source = await readFile(file, "utf8");
    const result = JavaScriptObfuscator.obfuscate(source, options);
    await writeFile(file, result.getObfuscatedCode(), "utf8");
  }
}

await run("npx tsc -b");
await run("npx vite build");
await obfuscateDist();
console.log("Obfuscated dist build ready in dist/");
