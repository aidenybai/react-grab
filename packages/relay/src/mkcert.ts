import { exec as execCallback } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir, platform, arch } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { pipeline } from "node:stream/promises";

const exec = promisify(execCallback);

const DATA_DIR = join(homedir(), ".react-grab");
const MKCERT_PATH = join(
  DATA_DIR,
  platform() === "win32" ? "mkcert.exe" : "mkcert",
);
const KEY_PATH = join(DATA_DIR, "localhost-key.pem");
const CERT_PATH = join(DATA_DIR, "localhost.pem");
const HOSTS_METADATA_PATH = join(DATA_DIR, "cert-hosts.json");

const MKCERT_ENV = { env: { ...process.env, CAROOT: DATA_DIR } };

interface GithubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GithubReleaseResponse {
  tag_name: string;
  assets: GithubReleaseAsset[];
}

const getPlatformIdentifier = (): string => {
  const architecture = arch() === "x64" ? "amd64" : arch();
  return platform() === "win32"
    ? `windows-${architecture}.exe`
    : `${platform()}-${architecture}`;
};

const fetchMkcertDownloadUrl = async (): Promise<string | undefined> => {
  const response = await fetch(
    "https://api.github.com/repos/FiloSottile/mkcert/releases/latest",
  );
  if (!response.ok) return undefined;

  const releaseData: GithubReleaseResponse = await response.json();
  const platformIdentifier = getPlatformIdentifier();
  const matchingAsset = releaseData.assets.find((asset) =>
    asset.name.includes(platformIdentifier),
  );

  return matchingAsset?.browser_download_url;
};

const downloadMkcert = async (downloadUrl: string): Promise<void> => {
  await mkdir(DATA_DIR, { recursive: true });

  const response = await fetch(downloadUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download mkcert: ${response.statusText}`);
  }

  const fileStream = createWriteStream(MKCERT_PATH);
  try {
    // HACK: Web ReadableStream and Node.js ReadableStream types are incompatible but work at runtime
    await pipeline(
      response.body as unknown as NodeJS.ReadableStream,
      fileStream,
    );
    await chmod(MKCERT_PATH, 0o755);
  } catch (error) {
    const { unlink } = await import("node:fs/promises");
    await unlink(MKCERT_PATH).catch(() => {});
    throw error;
  }
};

const runMkcert = async (args: string): Promise<void> => {
  await exec(`"${MKCERT_PATH}" ${args}`, MKCERT_ENV);
};

export interface Certificate {
  key: Buffer;
  cert: Buffer;
}

const CA_INSTALLED_FLAG = join(DATA_DIR, ".ca-installed");

const validateHostname = (hostname: string): void => {
  if (!/^[a-zA-Z0-9.-]+$/.test(hostname)) {
    throw new Error(`Invalid hostname: ${hostname}`);
  }
};

export const ensureCertificates = async (
  hosts: string[] = ["localhost", "127.0.0.1"],
): Promise<Certificate> => {
  hosts.forEach(validateHostname);

  if (!existsSync(MKCERT_PATH)) {
    const downloadUrl = await fetchMkcertDownloadUrl();
    if (!downloadUrl) {
      throw new Error(
        `Unsupported platform: ${platform()} ${arch()}. Cannot download mkcert.`,
      );
    }
    await downloadMkcert(downloadUrl);
  }

  if (!existsSync(CA_INSTALLED_FLAG)) {
    await runMkcert("-install");
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(CA_INSTALLED_FLAG, "");
  }

  let shouldRegenerateCerts = !existsSync(KEY_PATH) || !existsSync(CERT_PATH);

  if (!shouldRegenerateCerts && existsSync(HOSTS_METADATA_PATH)) {
    const storedHostsData = await readFile(HOSTS_METADATA_PATH, "utf-8");
    const storedHosts = JSON.parse(storedHostsData) as string[];
    const sortedStoredHosts = [...storedHosts].sort();
    const sortedRequestedHosts = [...hosts].sort();
    shouldRegenerateCerts =
      JSON.stringify(sortedStoredHosts) !==
      JSON.stringify(sortedRequestedHosts);
  } else if (!shouldRegenerateCerts) {
    shouldRegenerateCerts = true;
  }

  if (shouldRegenerateCerts) {
    await runMkcert(
      `-key-file "${KEY_PATH}" -cert-file "${CERT_PATH}" ${hosts.join(" ")}`,
    );
    await writeFile(HOSTS_METADATA_PATH, JSON.stringify(hosts));
  }

  const [key, cert] = await Promise.all([
    readFile(KEY_PATH),
    readFile(CERT_PATH),
  ]);
  return { key, cert };
};
