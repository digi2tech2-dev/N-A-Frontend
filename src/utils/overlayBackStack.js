const overlayCloseHandlers = [];

/**
 * Registers an existing overlay close callback for native system Back.
 * Entries are LIFO so the last UI layer opened gets the first chance to close.
 */
export const registerOverlayCloseHandler = (close) => {
  const entry = { close };
  overlayCloseHandlers.push(entry);

  return () => {
    const index = overlayCloseHandlers.lastIndexOf(entry);
    if (index !== -1) overlayCloseHandlers.splice(index, 1);
  };
};

export const closeTopOverlay = () => {
  const entry = overlayCloseHandlers.at(-1);
  if (!entry) return false;

  // An open, non-dismissible layer must still consume Back so it cannot
  // accidentally navigate away from the UI that intentionally blocks dismissal.
  entry.close();
  return true;
};
