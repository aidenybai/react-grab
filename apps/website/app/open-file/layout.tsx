import type { Metadata } from "next";

const title = "Open File";
const description = "Open a file in your preferred editor";
const ogImageUrl = `https://react-grab.com/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`;

export const metadata: Metadata = {
  title: `${title} | React Grab`,
  description,
  openGraph: {
    title: `${title} | React Grab`,
    description,
    url: "https://react-grab.com/open-file",
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
    title: `${title} | React Grab`,
    description,
    images: [ogImageUrl],
  },
};

interface OpenFileLayoutProps {
  children: React.ReactNode;
}

const OpenFileLayout = ({ children }: OpenFileLayoutProps) => {
  return children;
};

OpenFileLayout.displayName = "OpenFileLayout";

export default OpenFileLayout;
