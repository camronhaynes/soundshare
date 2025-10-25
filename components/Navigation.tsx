"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  const handleSignIn = () => {
    router.push("/login");
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 nav-bar">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center gap-1">
              {/* Waveform icon */}
              <div className="flex items-end gap-0.5 h-6">
                <div className="w-1 h-3 bg-neon-pink rounded-full group-hover:h-4 transition-all" />
                <div className="w-1 h-5 bg-neon-blue rounded-full group-hover:h-6 transition-all" />
                <div className="w-1 h-2 bg-neon-seafoam rounded-full group-hover:h-3 transition-all" />
                <div className="w-1 h-4 bg-neon-pink rounded-full group-hover:h-5 transition-all" />
              </div>
            </div>
            <span className="text-2xl font-bold text-gradient-neon">
              soundshare
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-300 hover:text-neon-blue transition-colors"
            >
              Home
            </Link>
            <Link
              href="/explore"
              className="text-gray-300 hover:text-neon-seafoam transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/about"
              className="text-gray-300 hover:text-neon-pink transition-colors"
            >
              About
            </Link>
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-4">
            {!isLoading && (
              <>
                {user ? (
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/${user.username}`}
                      className="text-gray-300 hover:text-neon-blue transition-colors flex items-center gap-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-plum-500 to-forest-600 flex items-center justify-center text-sm font-bold">
                        {user.name[0]?.toUpperCase()}
                      </div>
                      <span className="hidden md:inline">{user.name}</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-gray-400 hover:text-neon-pink transition-colors text-sm"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button onClick={handleSignIn} className="skeu-button">
                    Sign In
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
