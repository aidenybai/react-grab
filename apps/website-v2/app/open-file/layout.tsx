import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Open File",
  description: "Open a file in your preferred editor",
  path: "/open-file",
});

interface OpenFileLayoutProps {
  children: React.ReactNode;
}

const OpenFileLayout = ({ children }: OpenFileLayoutProps) => children;

OpenFileLayout.displayName = "OpenFileLayout";

export default OpenFileLayout;
