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
