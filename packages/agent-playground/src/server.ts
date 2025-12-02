const provider = process.env.PROVIDER ?? "claude";

if (provider === "ami") {
  console.log("⚠️ Ami provider is client-only and does not require a server.");
  console.log("   Use createAmiAgentProvider() directly in your client code.");
  process.exit(0);
}

const module = await import("./claude/server.js");
const server = module.default;

export default server;
