import { connection } from "next/server";
import { STREAMED_SERVER_DELAY_MS } from "./constants";

const waitForStream = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, STREAMED_SERVER_DELAY_MS);
  });

export const StreamedServerTarget = async () => {
  await connection();
  await waitForStream();

  return (
    <button data-testid="streamed-server-target" type="button">
      Delayed streamed server target
    </button>
  );
};
