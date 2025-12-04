import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { readFileSync } from "fs";
import { join } from "path";
import ReactGrabLogo from "@/public/logo.svg";
import { parseChangelog } from "@/utils/parse-changelog";

const title = "Changelog";
const description = "Release notes and version history for React Grab";
const ogImageUrl = `https://react-grab.com/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`;

export const metadata: Metadata = {
  title: `${title} - React Grab`,
  description,
  openGraph: {
    title: `${title} - React Grab`,
    description,
    url: "https://react-grab.com/changelog",
    siteName: "React Grab",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `React Grab - ${title}`,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} - React Grab`,
    description,
    images: [ogImageUrl],
  },
};

const getChangelog = () => {
  const changelogPath = join(process.cwd(), "..", "react-grab", "CHANGELOG.md");
  const content = readFileSync(changelogPath, "utf-8");
  return parseChangelog(content);
};

const ChangelogPage = () => {
  const entries = getChangelog();

  return (
    <div className="min-h-screen bg-black px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 pt-4 text-base sm:pt-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className="inline-flex" style={{ padding: "2px" }}>
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Image
              src={ReactGrabLogo}
              alt="React Grab"
              width={42}
              height={42}
              className="logo-shimmer-once"
            />
          </Link>
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-white font-bold">Changelog</div>
          <div className="text-sm text-neutral-500">
            Release notes and version history
          </div>
        </div>

        <div className="flex flex-col mt-8 gap-8">
          {entries.map((entry) => (
            <div key={entry.version} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-white font-mono text-sm font-medium">
                  {entry.version}
                </span>
                <span className="text-neutral-600 text-xs">
                  {entry.changeType}
                </span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {entry.changes.map((change, changeIndex) => (
                  <li
                    key={changeIndex}
                    className="text-neutral-400 text-sm flex items-start gap-2"
                  >
                    <span className="text-neutral-600 select-none">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

ChangelogPage.displayName = "ChangelogPage";

export default ChangelogPage;





