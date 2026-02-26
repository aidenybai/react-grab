import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReactGrabLogo } from "@/components/react-grab-logo";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-black px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 pt-4 text-base sm:pt-8 sm:text-lg">
        <Button
          asChild
          variant="link"
          size="sm"
          className="mb-4 h-auto px-0 py-0 text-sm text-neutral-400 opacity-50 hover:text-white hover:opacity-100"
        >
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to home
          </Link>
        </Button>

        <div className="inline-flex" style={{ padding: "2px" }}>
          <Link href="/" className="rounded-sm transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#ff4fff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
            <ReactGrabLogo
              width={42}
              height={42}
              className="logo-shimmer-once"
            />
          </Link>
        </div>

        <div className="text-white mt-4">
          <span className="font-bold shimmer-text-pink">404</span> &middot;
          Couldn&apos;t grab this page.
        </div>
      </div>
    </div>
  );
};

NotFound.displayName = "NotFound";

export default NotFound;
