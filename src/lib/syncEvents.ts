type SyncListener = (isSyncing: boolean, error?: boolean) => void;

const listeners: Set<SyncListener> = new Set();

export const syncEvents = {
  subscribe(listener: SyncListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit(isSyncing: boolean, error?: boolean) {
    listeners.forEach(l => l(isSyncing, error));
  }
};
