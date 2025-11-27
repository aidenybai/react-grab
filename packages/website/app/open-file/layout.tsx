import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open File | React Grab",
  description: "Open a file in your preferred editor",
};

const OpenFileLayout = ({ children }: { children: React.ReactNode }) => {
  return children;
};

OpenFileLayout.displayName = "OpenFileLayout";

export default OpenFileLayout;

