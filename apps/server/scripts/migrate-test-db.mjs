import { spawnSync } from "node:child_process";

import { config } from "dotenv";

config({ path: ".env.test", quiet: true });

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
