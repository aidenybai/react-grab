import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReactGrabLogo } from "@/components/react-grab-logo";

const title = "Privacy Policy";
const description =
  "Privacy policy for React Grab browser extension and website";
const ogImageUrl = `https://react-grab.com/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`;

export const metadata: Metadata = {
  title: `${title} - React Grab`,
  description,
  openGraph: {
    title: `${title} - React Grab`,
    description,
    url: "https://react-grab.com/privacy",
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

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-black px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 pt-4 text-base sm:pt-8 sm:text-lg">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-all mb-4 underline underline-offset-4 opacity-50 hover:opacity-100"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className="inline-flex" style={{ padding: "2px" }}>
          <Link href="/" className="transition-opacity hover:opacity-80">
            <ReactGrabLogo width={42} height={42} className="logo-shimmer-once" />
          </Link>
        </div>

        <div className="text-white mt-4">
          <span className="font-bold">Privacy Policy</span> &middot; Last updated{" "}
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>

        <div className="space-y-6 text-neutral-300 mt-4">
          <section>
            <h2 className="text-white font-bold mb-2">Overview</h2>
            <p>
              React Grab is a developer tool that helps you inspect and copy
              React components from web pages. This privacy policy explains how
              the React Grab browser extension and website handle your data.
            </p>
          </section>

          <section>
            <p className="text-white font-bold mb-2">Data Collection</p>
            <p className="mb-2">
              React Grab does NOT collect, store, or transmit any personal data.
              Specifically:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>We do not collect any personally identifiable information</li>
              <li>We do not track your browsing history</li>
              <li>We do not store any data about the websites you visit</li>
              <li>We do not use analytics or tracking services</li>
              <li>We do not use cookies for tracking purposes</li>
            </ul>
          </section>

          <section>
            <p className="text-white font-bold mb-2">How React Grab Works</p>
            <p className="mb-2">
              React Grab operates entirely locally in your browser. When you use
              the extension:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                The extension injects code into web pages to enable element
                selection
              </li>
              <li>
                When you select an element, the HTML/JSX is copied to your
                clipboard locally
              </li>
              <li>No data is sent to external servers</li>
              <li>All processing happens on your device</li>
            </ul>
          </section>

          <section>
            <p className="text-white font-bold mb-2">Permissions</p>
            <p className="mb-2">
              The extension requires the following permissions:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <span className="text-white">Access to all websites:</span>{" "}
                Required to inject the element selection functionality into any
                webpage you visit.
              </li>
              <li>
                <span className="text-white">Storage:</span> Used only to store your extension
                preferences locally on your device.
              </li>
              <li>
                <span className="text-white">Active Tab:</span> Needed to interact with the
                currently active tab when you use the keyboard shortcut.
              </li>
            </ul>
            <p className="mt-2">
              These permissions are used solely for the core functionality of
              the extension and are not used to collect or transmit any data.
            </p>
          </section>

          <section>
            <p className="text-white font-bold mb-2">Local Storage</p>
            <p>
              React Grab may store minimal settings locally on your device using
              browser storage APIs. This data never leaves your device and can
              be cleared by uninstalling the extension or clearing your browser
              data.
            </p>
          </section>

          <section>
            <p className="text-white font-bold mb-2">Third-Party Services</p>
            <p>
              React Grab does not integrate with any third-party analytics,
              tracking, or advertising services. The extension operates entirely
              offline and does not make any external network requests.
            </p>
          </section>

          <section>
            <p className="text-white font-bold mb-2">Open Source</p>
            <p>
              React Grab is open source software. You can review the complete
              source code on{" "}
              <a
                href="https://github.com/aidenybai/react-grab"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                GitHub
              </a>{" "}
              to verify these privacy claims.
            </p>
          </section>

          <section>
            <p className="text-white font-bold mb-2">Changes to This Policy</p>
            <p>
              We may update this privacy policy from time to time. Any changes
              will be posted on this page with an updated revision date.
            </p>
          </section>

          <section>
            <p className="text-white font-bold mb-2">Contact</p>
            <p>
              If you have questions about this privacy policy, please open an
              issue on our{" "}
              <a
                href="https://github.com/aidenybai/react-grab/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                GitHub repository
              </a>{" "}
              or join our{" "}
              <a
                href="https://discord.com/invite/G7zxfUzkm7"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                Discord community
              </a>
              .
            </p>
          </section>

          <section className="pt-6 border-t border-neutral-800">
            <p className="text-white font-bold mb-2">Summary</p>
            <p>
              React Grab respects your privacy. We don&apos;t collect, store, or
              transmit any of your personal data. The extension works entirely
              locally on your device.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

PrivacyPage.displayName = "PrivacyPage";

export default PrivacyPage;
