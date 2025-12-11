import pc from "picocolors";

const VERSION = process.env.VERSION ?? "0.0.0";

try {
  fetch(`https://www.react-grab.com/api/version?source=instant&t=${Date.now()}`).catch(() => {});
} catch {}

export const startServer = async (_port?: number) => {
  console.log(
    `${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Instant)")}`,
  );
  console.log(`${pc.yellow("⚠")} Instant provider does not require a server`);
};
