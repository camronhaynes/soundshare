"use client";

import { use, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useTracks } from "@/lib/TracksContext";
import Link from "next/link";
import UploadModal from "@/components/UploadModal";
import TrackCard from "@/components/TrackCard";

interface UserPageProps {
  params: Promise<{
    username: string;
  }>;
}

export default function UserPage({ params }: UserPageProps) {
  const { username } = use(params);
  const { user } = useAuth();
  const { addTrack, getUserTracks, deleteTrack } = useTracks();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const isOwner = user?.username === username;
  const userTracks = getUserTracks(username);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* User Header */}
        <div className="glass-card p-8">
          <div className="flex items-center gap-6">
            {/* Avatar placeholder */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-plum-500 to-forest-600 shadow-neon-pink flex items-center justify-center text-4xl font-bold">
              {username[0]?.toUpperCase() || 'U'}
            </div>

            {/* User info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gradient-plum mb-2">
                {username}
              </h1>
              <p className="text-gray-400">
                {isOwner ? "Your collection" : `${username}'s collection`}
              </p>
            </div>

            {/* Action button - only show for owner */}
            {isOwner && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="skeu-button"
              >
                Upload Track
              </button>
            )}
          </div>
        </div>

        {/* Tracks Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-200">
            Tracks {userTracks.length > 0 && `(${userTracks.length})`}
          </h2>

          {userTracks.length > 0 ? (
            <div className="space-y-4">
              {userTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isOwner={isOwner}
                  onDelete={deleteTrack}
                />
              ))}
            </div>
          ) : (
            /* Empty state with retro vibes */
            <div className="waveform-container text-center py-16">
              <div className="space-y-4">
                <div className="text-6xl">🎵</div>
                <p className="text-xl text-gray-400">
                  No tracks yet
                </p>
                <p className="text-gray-500">
                  {isOwner
                    ? "Upload your first loop, clip, or recording to get started"
                    : `${username} hasn't uploaded any tracks yet`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Back to home */}
        <div className="text-center">
          <Link
            href="/"
            className="text-neon-blue hover:text-neon-seafoam transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={async (file, title) => {
          await addTrack(username, file, title);
        }}
      />
    </main>
  );
}
