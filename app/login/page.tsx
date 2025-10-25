"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && name.trim()) {
      login(username.toLowerCase().replace(/\s+/g, ''), name);
      router.push(`/${username.toLowerCase().replace(/\s+/g, '')}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient-neon mb-2">
            Welcome to soundshare
          </h1>
          <p className="text-gray-400">
            Create your account to start sharing audio
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              Display Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="DJ Cool Vibes"
              className="skeu-input w-full text-white"
              required
            />
            <p className="text-xs text-gray-500">
              This is how others will see you
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              placeholder="djcoolvibes"
              className="skeu-input w-full text-white"
              pattern="[a-z0-9]+"
              required
            />
            <p className="text-xs text-gray-500">
              Your unique URL: soundshare.com/{username || 'username'}
            </p>
          </div>

          <button type="submit" className="skeu-button w-full text-lg py-4">
            Create Account
          </button>
        </form>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            This is a demo login - no password needed!
          </p>
        </div>
      </div>
    </main>
  );
}
