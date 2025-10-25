// Utility to clear all storage (for recovery from errors)

export async function clearAllStorage() {
  // Clear localStorage
  try {
    localStorage.clear();
    console.log("✅ Cleared localStorage");
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }

  // Clear IndexedDB
  try {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
        console.log(`✅ Deleted database: ${db.name}`);
      }
    }
  } catch (error) {
    console.error("Failed to clear IndexedDB:", error);
  }

  console.log("✅ All storage cleared. Please refresh the page.");
}

// Make it available in the browser console
if (typeof window !== 'undefined') {
  (window as any).clearSoundshareStorage = clearAllStorage;
  console.log("💡 Run `clearSoundshareStorage()` in console to reset all data");
}
