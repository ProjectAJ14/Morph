const { spawn } = require("child_process");
const path = require("path");

// Start Vite dev server, then launch Electron once it's ready
const waitOn = require("wait-on");
const concurrently = require("concurrently");

concurrently(
  [
    { command: "npm run dev", name: "vite", prefixColor: "green" },
    {
      command: `npx wait-on http://localhost:5173 && npx electron .`,
      name: "electron",
      prefixColor: "blue",
    },
  ],
  {
    killOthers: ["failure", "success"],
    restartTries: 0,
  }
);
