"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import MultiTrackPlayer from "@/components/MultiTrackPlayer";
import StemUpload from "@/components/StemUpload";

interface Stem {
  id: string;
  stemType: string;
  title: string;
  filename: string;
  filePath: string;
  order: number;
}

interface StemGroup {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  stems: Stem[];
  user: {
    id: string;
    username: string;
    name: string;
  };
}

export default function StemsPage() {
  const { user } = useAuth();
  const [stemGroups, setStemGroups] = useState<StemGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStemGroups = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/stems');
      if (!response.ok) {
        throw new Error('Failed to load stem groups');
      }

      const data = await response.json();
      setStemGroups(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStemGroups();
  }, []);

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this stem group?')) return;

    try {
      const response = await fetch(`/api/stems?id=${groupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete stem group');
      }

      // Reload stem groups
      loadStemGroups();
    } catch (err: any) {
      alert('Failed to delete stem group: ' + err.message);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-gradient-neon">
            🎛️ Multi-Stem Mixer 🎚️
          </h1>
          <p className="text-lg text-gray-400">
            Upload and mix multi-track projects with individual stem control
          </p>
        </div>

        {/* Upload Section */}
        {user && (
          <div className="max-w-3xl mx-auto">
            <StemUpload onUploadComplete={loadStemGroups} />
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="text-4xl animate-spin">⏳</div>
            <p className="text-gray-400 mt-4">Loading stem groups...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="glass-card text-center py-8 border-red-500/50">
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadStemGroups}
              className="mt-4 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stem Groups */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {stemGroups.length > 0 ? (
              <>
                <h2 className="text-2xl font-semibold text-gray-200">
                  Stem Projects ({stemGroups.length})
                </h2>
                <div className="space-y-6">
                  {stemGroups.map((group) => (
                    <div key={group.id} className="relative">
                      {/* Delete button for owner - positioned below the header */}
                      {user && user.id === group.user.id && (
                        <button
                          onClick={() => handleDelete(group.id)}
                          className="absolute top-[60px] right-6 z-10 text-gray-500 hover:text-red-400 transition-colors p-2"
                          title="Delete stem group"
                        >
                          🗑️
                        </button>
                      )}

                      <MultiTrackPlayer
                        stemGroup={group}
                        isOwner={user?.id === group.user.id}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="glass-card text-center py-16 space-y-4">
                <div className="text-6xl">🎚️</div>
                <p className="text-xl text-gray-400">
                  No stem groups yet
                </p>
                <p className="text-gray-500">
                  {user ? "Upload your first multi-stem project above!" : "Login to upload stem groups"}
                </p>
              </div>
            )}
          </div>
        )}

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
            Explore →
          </Link>
        </div>
      </div>
    </main>
  );
}