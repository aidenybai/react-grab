import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReactGrabLogo } from "@/components/react-grab-logo";

const NotFound = () => {
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
            <ReactGrabLogo
              width={42}
              height={42}
              className="logo-shimmer-once"
            />
          </Link>
        </div>

        <div className="text-white mt-4">
          <span className="font-bold">404</span> &middot; Couldn&apos;t grab
          this page.
        </div>
      </div>
    </div>
  );
};

NotFound.displayName = "NotFound";

export default NotFound;
