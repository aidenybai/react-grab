import { exec, execSync, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const version = process.env.VERSION ?? "latest";
const cliPackage =
  version === "latest" || version === "[DEV]"
    ? "@react-grab/cli"
    : `@react-grab/cli@${version}`;

const withLoader = <T>(fn: () => Promise<T>): Promise<T> => {
  const frames = ["|", "/", "-", "\\"];
  let i = 0;

  process.stdout.write(frames[0]);
  const interval = setInterval(() => {
    i = (i + 1) % frames.length;
    process.stdout.write(`\r${frames[i]}`);
  }, 80);

  return fn().finally(() => {
    clearInterval(interval);
    process.stdout.write("\r \r");
  });
};

const getGlobalRoot = (): string | null => {
  try {
    return execSync("npm root -g", { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
};

const getGlobalCliPath = (globalRoot: string | null): string | null => {
  if (!globalRoot) return null;
  const cliPath = `${globalRoot}/@react-grab/cli/dist/cli.js`;
  return existsSync(cliPath) ? cliPath : null;
};

const getInstalledVersion = (globalRoot: string | null): string | null => {
  if (!globalRoot) return null;
  const pkgPath = `${globalRoot}/@react-grab/cli/package.json`;
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      version: string;
    };
    return pkg.version;
  } catch {
    return null;
  }
};

const installCli = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["install", "-g", cliPackage], {
      stdio: "pipe",
    });
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error("Install failed")),
    );
    child.on("error", (err) => reject(err));
  });
};

const updateCliInBackground = (): void => {
  exec(`npm install -g ${cliPackage}`);
};

const main = async (): Promise<void> => {
  const globalRoot = getGlobalRoot();
  let cliPath = getGlobalCliPath(globalRoot);

  if (!cliPath) {
    try {
      await withLoader(installCli);
    } catch {
      console.error("Setup failed. Please try again.");
      process.exit(1);
    }
    cliPath = getGlobalCliPath(getGlobalRoot());
  } else {
    const installedVersion = getInstalledVersion(globalRoot);
    const targetVersion =
      version === "latest" || version === "[DEV]" ? null : version;

    if (targetVersion && installedVersion !== targetVersion) {
      updateCliInBackground();
    }
  }

  if (!cliPath) {
    console.error("Setup failed. Please try again.");
    process.exit(1);
  }

  const result = spawnSync(
    process.execPath,
    [cliPath, ...process.argv.slice(2)],
    {
      stdio: "inherit",
    },
  );

  if (result.error) {
    console.error("Setup failed. Please try again.");
    process.exit(1);
  }

  process.exit(result.status ?? 0);
};

void main();
