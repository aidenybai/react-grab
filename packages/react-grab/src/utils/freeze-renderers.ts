import { IS_DEMO } from "./runtime-mode.js";
import { throwCollectedErrors } from "./throw-collected-errors.js";

interface RendererFreezeRegistration {
  freeze: () => void;
  isConnected: () => boolean;
  unfreeze: () => void;
}

const registrations = new Set<RendererFreezeRegistration>();
const frozenRegistrations = new Set<RendererFreezeRegistration>();
let isRendererFreezeActive = false;

const unfreezeRegistration = (
  registration: RendererFreezeRegistration,
  cleanupErrors: unknown[],
): void => {
  if (!frozenRegistrations.has(registration)) return;
  try {
    registration.unfreeze();
  } catch (error) {
    cleanupErrors.push(error);
  } finally {
    frozenRegistrations.delete(registration);
  }
};

export const registerRendererFreeze = (registration: RendererFreezeRegistration): (() => void) => {
  registrations.add(registration);
  try {
    if (isRendererFreezeActive && registration.isConnected()) {
      registration.freeze();
      frozenRegistrations.add(registration);
    }
  } catch (error) {
    registrations.delete(registration);
    throw error;
  }

  return () => {
    const cleanupErrors: unknown[] = [];
    unfreezeRegistration(registration, cleanupErrors);
    registrations.delete(registration);
    throwCollectedErrors(cleanupErrors, "Unregistering renderer freeze failed");
  };
};

export const freezeRegisteredRenderers = (): void => {
  if (IS_DEMO || isRendererFreezeActive) return;
  isRendererFreezeActive = true;

  try {
    for (const registration of registrations) {
      if (!registration.isConnected()) continue;
      registration.freeze();
      frozenRegistrations.add(registration);
    }
  } catch (error) {
    isRendererFreezeActive = false;
    const cleanupErrors: unknown[] = [];
    for (const frozenRegistration of [...frozenRegistrations].reverse()) {
      unfreezeRegistration(frozenRegistration, cleanupErrors);
    }
    if (cleanupErrors.length === 0) throw error;
    throw new AggregateError([error, ...cleanupErrors], "Rolling back renderer freeze failed");
  }
};

export const unfreezeRegisteredRenderers = (): void => {
  if (!isRendererFreezeActive) return;
  isRendererFreezeActive = false;
  const cleanupErrors: unknown[] = [];
  for (const registration of [...frozenRegistrations].reverse()) {
    unfreezeRegistration(registration, cleanupErrors);
  }
  throwCollectedErrors(cleanupErrors, "Unfreezing renderers failed");
};
