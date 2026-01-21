import { IconCursor } from "./icons/icon-cursor";

export const CursorInstallButton = () => {
  return (
    <a
      href="cursor://anysphere.cursor-deeplink/prompt?text=1.+Run+curl+-s+https%3A%2F%2Freact-grab.com%2Fllms.txt+%0A2.+Understand+the+content+and+follow+the+instructions+to+install+React+Grab.%0A3.+Tell+the+user+to+refresh+their+local+app+and+explain+how+to+use+React+Grab"
      target="_blank"
      rel="noreferrer"
      className="hidden sm:inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/10 sm:text-base"
    >
      <IconCursor className="h-[15px] w-[15px]" />
      Install with Cursor
    </a>
  );
};

CursorInstallButton.displayName = "CursorInstallButton";
