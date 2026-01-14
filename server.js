const path = require("node:path");

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const standaloneDir = path.join(__dirname, ".next", "standalone");
const standaloneServer = path.join(standaloneDir, "server.js");

process.chdir(standaloneDir);
require(standaloneServer);
