export const register = async (): Promise<void> => {
  if (process.env.NODE_ENV !== "development") return;

  const { startMcpServer } = await import("@react-grab/mcp/server");
  startMcpServer().catch((error: unknown) => {
    console.error("Failed to start MCP server:", error);
  });
};
