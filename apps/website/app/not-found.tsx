import { PageHeader } from "@/components/page-header";
import { REACT_GRAB_PINK } from "@/lib/constants";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background px-6 py-8 text-prose sm:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col pt-8">
        <PageHeader
          title={
            <>
              <span style={{ color: REACT_GRAB_PINK }}>404</span>
              {" · Couldn't grab this page."}
            </>
          }
        />
      </div>
    </div>
  );
};

NotFound.displayName = "NotFound";

export default NotFound;
