import type { Metadata } from "next";

const title = "Inspect";
const description =
  "Paste React Grab output to visualize element context in raw and formatted views.";
const ogImageUrl = `https://react-grab.com/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`;

export const metadata: Metadata = {
  title: `${title} | React Grab`,
  description,
  openGraph: {
    title: `${title} | React Grab`,
    description,
    url: "https://react-grab.com/inspect",
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
  alternates: {
    canonical: "https://react-grab.com/inspect",
  },
};

interface InspectLayoutProps {
  children: React.ReactNode;
}

const InspectLayout = (props: InspectLayoutProps) => {
  return props.children;
};

InspectLayout.displayName = "InspectLayout";

export default InspectLayout;
