const nativeBackActions = [];

/**
 * Registers a current-screen Back action for Android system Back. Entries are
 * LIFO so a nested screen action can take precedence over its parent layout.
 */
export const registerNativeBackAction = (action) => {
  const entry = { action };
  nativeBackActions.push(entry);

  return () => {
    const index = nativeBackActions.lastIndexOf(entry);
    if (index !== -1) nativeBackActions.splice(index, 1);
  };
};

export const runCurrentNativeBackAction = () => {
  const entry = nativeBackActions.at(-1);
  if (!entry) return false;

  entry.action();
  return true;
};
