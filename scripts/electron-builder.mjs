import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const pad2 = (value) => String(value).padStart(2, "0");

const now = new Date();
const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(
  now.getHours()
)}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;

const outputDir = path.join(process.cwd(), "build_dist", `run-${stamp}`);
fs.mkdirSync(outputDir, { recursive: true });

const bin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "electron-builder.cmd" : "electron-builder"
);

if (!fs.existsSync(bin)) {
  console.error(`electron-builder not found at: ${bin}`);
  process.exit(1);
}

const args = [
  `--config.directories.output=${outputDir}`
];

const child = spawn(bin, args, {
  stdio: "inherit",
  windowsHide: false,
  shell: process.platform === "win32"
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
