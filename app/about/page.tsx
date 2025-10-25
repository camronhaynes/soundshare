"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Golden ratio for sacred geometry
  const phi = 1.618033988749895;

  return (
    <main className="min-h-screen p-8 pb-20">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-gradient-neon tracking-tight">
            About soundshare
          </h1>
          <p className="text-xl text-gray-400 font-light">
            Where audio becomes artifact
          </p>
        </div>

        {/* Esoteric Visualizer - Sacred Geometry + Wave Interference */}
        <div className="waveform-container max-w-4xl mx-auto">
          <div className="relative h-64 flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-plum-950/30 to-forest-950/30 border border-plum-500/20">
            {/* Outer ring - Fibonacci spiral simulation */}
            <div className="absolute inset-0 flex items-center justify-center">
              {mounted && [...Array(89)].map((_, i) => {
                // Fibonacci sequence approximation for positioning
                const angle = i * (360 / phi);
                const radius = Math.sqrt(i) * 8;
                const x = Math.cos(angle * Math.PI / 180) * radius;
                const y = Math.sin(angle * Math.PI / 180) * radius;

                // Wave interference based on position
                const wave1 = Math.sin(i * 0.2 + angle * 0.01);
                const wave2 = Math.cos(i * 0.15);
                const intensity = ((wave1 + wave2) / 2 + 1) / 2;

                const size = (2 + intensity * 3).toFixed(2);
                const opacity = (0.3 + intensity * 0.5).toFixed(2);

                // Color based on position in spiral
                const hue = (angle + i * 5) % 360;
                const colorClass =
                  hue < 120 ? 'bg-neon-pink' :
                  hue < 240 ? 'bg-neon-blue' :
                  'bg-neon-seafoam';

                return (
                  <div
                    key={i}
                    className={`absolute rounded-full ${colorClass} wave-bar`}
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      left: `calc(50% + ${x.toFixed(2)}px)`,
                      top: `calc(50% + ${y.toFixed(2)}px)`,
                      opacity: opacity,
                      animationDelay: `${(i * 0.03).toFixed(2)}s`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                );
              })}
            </div>

            {/* Center core - Concentric waves */}
            <div className="absolute inset-0 flex items-center justify-center">
              {mounted && [...Array(12)].map((_, ring) => {
                const points = 8 + ring * 4;
                return (
                  <div key={ring} className="absolute">
                    {[...Array(points)].map((_, i) => {
                      const angle = (i * 360) / points;
                      const radius = 20 + ring * 15;
                      const x = Math.cos(angle * Math.PI / 180) * radius;
                      const y = Math.sin(angle * Math.PI / 180) * radius;

                      // Pulsing based on ring and position
                      const phase = (ring * 0.5 + i * 0.1).toFixed(2);

                      const colorClass = ring % 3 === 0 ? 'bg-plum-400' :
                                       ring % 3 === 1 ? 'bg-forest-400' :
                                       'bg-neon-blue';

                      return (
                        <div
                          key={i}
                          className={`absolute w-2 h-2 rounded-full ${colorClass} wave-bar-alt`}
                          style={{
                            left: `calc(50% + ${x.toFixed(2)}px)`,
                            top: `calc(50% + ${y.toFixed(2)}px)`,
                            animationDelay: `${phase}s`,
                            opacity: '0.6',
                            transform: 'translate(-50%, -50%)'
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Vertical interference bars */}
            <div className="absolute inset-0 flex items-center justify-center gap-1">
              {mounted && [...Array(80)].map((_, i) => {
                // Complex multi-frequency interference
                const t = i / 80;
                const wave1 = Math.sin(t * Math.PI * 8) * 35;
                const wave2 = Math.cos(t * Math.PI * 13) * 25;
                const wave3 = Math.sin(t * Math.PI * 21) * 15;
                const height = (Math.abs(wave1 + wave2 + wave3) + 10).toFixed(2);

                const colors = ['bg-neon-pink', 'bg-neon-blue', 'bg-neon-seafoam', 'bg-plum-400'];
                const color = colors[i % 4];
                const delay = (Math.sin(i * 0.1) * 2).toFixed(2);

                return (
                  <div
                    key={i}
                    className={`w-0.5 rounded-full ${color} wave-bar opacity-40`}
                    style={{
                      height: `${height}%`,
                      animationDelay: `${delay}s`
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* About Content */}
        <div className="glass-card p-12 space-y-8">
          <div className="space-y-6 text-gray-300 leading-relaxed">
            <p className="text-xl">
              soundshare is a nostalgic homage to the early web—when uploading a sound felt like
              casting a message into the digital void, hoping someone, somewhere would hear it.
            </p>

            <p className="text-lg">
              We exist in the intersection of <span className="neon-text-pink">memory</span> and{' '}
              <span className="neon-text-blue">utility</span>. Upload your loops, clips, field
              recordings, or musical experiments. Share them with a link. Stream them anywhere.
            </p>

            <p className="text-lg">
              No algorithms. No recommendations. No feeds. Just{' '}
              <span className="neon-text-seafoam">pure audio artifacts</span> floating in
              cyberspace, waiting to be discovered.
            </p>

            <div className="pt-6 border-t border-plum-500/30">
              <h3 className="text-2xl font-semibold text-gradient-plum mb-4">
                The Philosophy
              </h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="text-neon-pink mt-1">◆</span>
                  <span>Audio deserves to exist as <em>artifact</em>—not content</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-neon-blue mt-1">◆</span>
                  <span>The web was better when it was weird and personal</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-neon-seafoam mt-1">◆</span>
                  <span>Every sound file is a tiny universe</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-plum-400 mt-1">◆</span>
                  <span>Form follows <em>feeling</em>, not metrics</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t border-plum-500/30">
              <h3 className="text-2xl font-semibold text-gradient-plum mb-4">
                Technical Details
              </h3>
              <p className="text-gray-400">
                Built with Next.js, styled with nostalgia. Support for MP3, WAV, FLAC, and OGG.
                Waveform visualization powered by mathematical wave interference patterns.
                Designed to feel like software from 2001, but function like 2025.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-6 pt-8">
          <Link
            href="/"
            className="text-neon-blue hover:text-neon-seafoam transition-colors"
          >
            ← Home
          </Link>
          <Link
            href="/explore"
            className="text-neon-pink hover:text-neon-seafoam transition-colors"
          >
            ← Explore
          </Link>
        </div>

        {/* Footer signature */}
        <div className="text-center text-gray-600 text-sm pt-8">
          <p>~ a digital relic for the modern age ~</p>
        </div>
      </div>
    </main>
  );
}
