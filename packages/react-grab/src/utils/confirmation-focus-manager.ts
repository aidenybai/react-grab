// Only one confirmation UI (discard prompt, completion view, etc.) should
// respond to Enter/Escape at a time, so this module-level singleton tracks
// the active instance via Symbol IDs. The release guard ensures a stale
// teardown from one component cannot steal focus from a newer claimant.
let activeConfirmationId: symbol | null = null;

export const confirmationFocusManager = {
  claim: (id: symbol): void => {
    activeConfirmationId = id;
  },
  release: (id: symbol): void => {
    if (activeConfirmationId === id) {
      activeConfirmationId = null;
    }
  },
  isActive: (id: symbol): boolean => activeConfirmationId === id,
};
