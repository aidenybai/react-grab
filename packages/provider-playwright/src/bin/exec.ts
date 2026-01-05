#!/usr/bin/env node

import { DEFAULT_PORT } from "../constants";

const HTTP_PORT = DEFAULT_PORT + 1;

const main = async () => {
  const expression = process.argv.slice(2).join(" ");

  if (!expression) {
    console.error("Usage: exec <javascript expression>");
    console.error("Example: exec document.title");
    process.exit(1);
  }

  const response = await fetch(`http://localhost:${HTTP_PORT}/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: expression }),
  });

  const data = await response.json();

  if (!data.success) {
    console.error(data.error || "Command failed");
    process.exit(1);
  }

  if (data.result !== undefined) {
    console.log(
      typeof data.result === "string"
        ? data.result
        : JSON.stringify(data.result, null, 2),
    );
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
