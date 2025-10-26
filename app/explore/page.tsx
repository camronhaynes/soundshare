"use client";

import Link from "next/link";
import { useTracks } from "@/lib/TracksContext";
import TrackCard from "@/components/TrackCard";
import { Track } from "@/lib/TracksContext";

export default function ExplorePage() {
  const { tracks } = useTracks();

  // Default demo track that any user can play with
  const defaultTrack: Track = {
    id: 'default-demo',
    title: 'Ocean Avenue (Demo)',
    filename: 'default-track.mp3',
    fileUrl: '/default-track.mp3',
    fileSize: 0, // Will be loaded from actual file
    format: 'mp3',
    uploadedBy: 'soundshare',
    createdAt: new Date().toISOString()
  };

  // Combine default track with user tracks
  const allTracks = [defaultTrack, ...tracks];
  const featuredTracks = allTracks.slice(0, 10);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-gradient-neon">
            Explore
          </h1>
          <p className="text-lg text-gray-400">
            Featured clips, loops, and recordings from the soundshare community
          </p>
        </div>

        {/* Featured Waveform Decoration */}
        <div className="waveform-container max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-1 h-24">
            {[...Array(60)].map((_, i) => {
              // Dual-frequency interference pattern
              const freq1 = Math.sin(i * 0.3) * 30;
              const freq2 = Math.cos(i * 0.15) * 20;
              const height = (Math.abs(freq1 + freq2) + 15).toFixed(2);

              const colors = ['bg-neon-blue', 'bg-neon-seafoam', 'bg-plum-400'];
              const color = colors[i % 3];
              const delay = (i * 0.04).toFixed(1);

              return (
                <div
                  key={i}
                  className={`w-1 rounded-full ${color} wave-bar opacity-60 hover:opacity-100`}
                  style={{
                    height: `${height}%`,
                    animationDelay: `${delay}s`
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Featured Tracks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-200">
              Featured Tracks
            </h2>
            <span className="text-sm text-gray-500">
              {featuredTracks.length} clips
            </span>
          </div>

          {featuredTracks.length > 0 ? (
            <div className="space-y-4">
              {featuredTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isOwner={false}
                  onDelete={() => {}}
                />
              ))}
            </div>
          ) : (
            <div className="glass-card text-center py-16 space-y-4">
              <div className="text-6xl">🎧</div>
              <p className="text-xl text-gray-400">
                No featured tracks yet
              </p>
              <p className="text-gray-500">
                Check back soon for curated audio experiences
              </p>
            </div>
          )}
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
            href="/about"
            className="text-neon-pink hover:text-neon-seafoam transition-colors"
          >
            About →
          </Link>
        </div>
      </div>
    </main>
  );
}
