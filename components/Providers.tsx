"use client";

import { AuthProvider } from "@/lib/AuthContext";
import { TracksProvider } from "@/lib/TracksContext";
import "@/lib/clearStorage"; // Make clearSoundshareStorage() available in console

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TracksProvider>{children}</TracksProvider>
    </AuthProvider>
  );
}
