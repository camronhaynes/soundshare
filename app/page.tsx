"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 pb-20">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Tagline */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-gradient-neon tracking-tight">
            Your Audio, Your Vibe
          </h1>
          <p className="text-lg text-gray-400 font-light">
            Upload, stream, and share your sounds with retro style
          </p>
        </div>

        {/* Waveform-inspired decorative element */}
        <div className="waveform-container max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-1 h-32">
            {[...Array(50)].map((_, i) => {
              // Create a more balanced waveform using multiple frequencies
              const wave1 = Math.sin(i * 0.2) * 25;
              const wave2 = Math.sin(i * 0.5) * 15;
              const wave3 = Math.cos(i * 0.15) * 10;
              const height = (Math.abs(wave1 + wave2 + wave3) + 20).toFixed(2);

              const colors = ['bg-neon-pink', 'bg-neon-blue', 'bg-neon-seafoam'];
              const color = colors[i % 3];
              const animClass = i % 2 === 0 ? 'wave-bar' : 'wave-bar-alt';
              const delay = (i * 0.05).toFixed(1);

              return (
                <div
                  key={i}
                  className={`w-1.5 rounded-full ${color} ${animClass} opacity-70 hover:opacity-100`}
                  style={{
                    height: `${height}%`,
                    animationDelay: `${delay}s`
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="glass-card p-8 max-w-2xl mx-auto space-y-6">
          <p className="text-lg text-gray-300 leading-relaxed">
            Upload your <span className="neon-text-pink">loops</span>,{' '}
            <span className="neon-text-blue">clips</span>, and{' '}
            <span className="neon-text-seafoam">recordings</span>.
            Stream them anywhere with that nostalgic Windows XP vibe.
          </p>

          {/* Features List */}
          <div className="grid grid-cols-2 gap-4 text-left text-sm text-gray-400 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-neon-pink">●</span>
              <span>MP3, WAV, FLAC, OGG support</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neon-seafoam">●</span>
              <span>Shareable links</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neon-blue">●</span>
              <span>Waveform visualizations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-plum-400">●</span>
              <span>Instant streaming</span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center pt-4">
            {user ? (
              <Link href={`/${user.username}`} className="skeu-button text-lg px-8 py-4">
                Go to Your Collection
              </Link>
            ) : (
              <Link href="/login" className="skeu-button text-lg px-8 py-4">
                Sign In to Get Started
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>soundshare v0.1 - built with next.js + nostalgia</p>
      </footer>
    </main>
  );
}
