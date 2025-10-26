"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

export interface Track {
  id: string;
  userId: string;
  title: string;
  filename: string;
  fileUrl: string; // Now points to /api/stream/[trackId]
  filePath: string;
  duration: number;
  createdAt: string;
  fileSize: number;
  format: string;
  user?: {
    id: string;
    username: string;
    name: string;
  };
}

interface TracksContextType {
  tracks: Track[];
  addTrack: (userId: string, file: File, title: string) => Promise<void>;
  getUserTracks: (userId: string) => Track[];
  deleteTrack: (trackId: string) => Promise<void>;
  isLoading: boolean;
  loadUserTracks: (username?: string) => Promise<void>;
}

const TracksContext = createContext<TracksContextType | undefined>(undefined);

export function TracksProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Load tracks on mount or when user changes
    if (user) {
      loadUserTracks();
    } else {
      setTracks([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadUserTracks = async (username?: string) => {
    setIsLoading(true);
    try {
      const url = username
        ? `/api/tracks?username=${username}`
        : '/api/tracks';

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Transform tracks to include fileUrl for streaming
        const transformedTracks = data.map((track: any) => ({
          ...track,
          fileUrl: `/api/stream/${track.id}`, // Use streaming endpoint
        }));
        setTracks(transformedTracks);
      }
    } catch (error) {
      console.error("Failed to load tracks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTrack = async (userId: string, file: File, title: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      const newTrack = {
        ...data.track,
        fileUrl: `/api/stream/${data.track.id}`,
      };

      // Update state with the new track
      setTracks((prev) => [newTrack, ...prev]);
    } catch (error) {
      console.error("Failed to save track:", error);
      throw error;
    }
  };

  const getUserTracks = (userId: string): Track[] => {
    return tracks.filter((track) => track.userId === userId);
  };

  const deleteTrack = async (trackId: string) => {
    try {
      const response = await fetch(`/api/tracks?id=${trackId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete track');
      }

      setTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch (error) {
      console.error("Failed to delete track:", error);
      throw error;
    }
  };

  return (
    <TracksContext.Provider value={{ tracks, addTrack, getUserTracks, deleteTrack, isLoading, loadUserTracks }}>
      {children}
    </TracksContext.Provider>
  );
}

export function useTracks() {
  const context = useContext(TracksContext);
  if (context === undefined) {
    throw new Error("useTracks must be used within a TracksProvider");
  }
  return context;
}
