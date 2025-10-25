"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loadTracks, saveTracks, deleteTrackFromDB, TrackData } from "./db";

export interface Track {
  id: string;
  userId: string;
  title: string;
  filename: string;
  fileUrl: string; // blob URL
  createdAt: string;
  fileSize: number;
  format: string;
}

interface TracksContextType {
  tracks: Track[];
  addTrack: (userId: string, file: File, title: string) => Promise<void>;
  getUserTracks: (userId: string) => Track[];
  deleteTrack: (trackId: string) => void;
  isLoading: boolean;
}

const TracksContext = createContext<TracksContextType | undefined>(undefined);

export function TracksProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load tracks from IndexedDB on mount
    async function loadTracksFromDB() {
      try {
        const storedTracks = await loadTracks();
        // Create blob URLs from stored blobs
        const tracksWithUrls = storedTracks.map((track: TrackData) => ({
          id: track.id,
          userId: track.userId,
          title: track.title,
          filename: track.filename,
          fileUrl: URL.createObjectURL(track.fileBlob),
          createdAt: track.createdAt,
          fileSize: track.fileSize,
          format: track.format,
        }));
        setTracks(tracksWithUrls);
      } catch (error) {
        console.error("Failed to load tracks:", error);
        // Clear broken localStorage if it exists
        try {
          localStorage.removeItem("soundshare_tracks");
        } catch (e) {
          // Ignore
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadTracksFromDB();
  }, []);

  useEffect(() => {
    // Save tracks to IndexedDB whenever they change
    if (!isLoading && tracks.length > 0) {
      // Convert tracks to TrackData format with blobs
      fetch(tracks[0].fileUrl)
        .then(async () => {
          // We need to recreate blobs from URLs for storage
          // For now, we'll handle this in addTrack
        })
        .catch(console.error);
    }
  }, [tracks, isLoading]);

  const addTrack = async (userId: string, file: File, title: string) => {
    const format = file.name.split('.').pop()?.toUpperCase() || 'MP3';
    const blob = new Blob([file], { type: file.type });
    const fileUrl = URL.createObjectURL(blob);

    const newTrack: Track = {
      id: Date.now().toString(),
      userId,
      title,
      filename: file.name,
      fileUrl,
      createdAt: new Date().toISOString(),
      fileSize: file.size,
      format,
    };

    // Save to IndexedDB
    const trackData: TrackData = {
      id: newTrack.id,
      userId: newTrack.userId,
      title: newTrack.title,
      filename: newTrack.filename,
      fileBlob: blob,
      createdAt: newTrack.createdAt,
      fileSize: newTrack.fileSize,
      format: newTrack.format,
    };

    try {
      // Get all existing tracks
      const existingTracks = await loadTracks();
      await saveTracks([...existingTracks, trackData]);

      // Update state
      setTracks((prev) => [newTrack, ...prev]);
    } catch (error) {
      console.error("Failed to save track:", error);
      throw new Error("Failed to save track. Storage might be full.");
    }
  };

  const getUserTracks = (userId: string): Track[] => {
    return tracks.filter((track) => track.userId === userId);
  };

  const deleteTrack = async (trackId: string) => {
    try {
      await deleteTrackFromDB(trackId);

      setTracks((prev) => {
        const track = prev.find((t) => t.id === trackId);
        if (track?.fileUrl) {
          URL.revokeObjectURL(track.fileUrl);
        }
        return prev.filter((t) => t.id !== trackId);
      });
    } catch (error) {
      console.error("Failed to delete track:", error);
    }
  };

  return (
    <TracksContext.Provider value={{ tracks, addTrack, getUserTracks, deleteTrack, isLoading }}>
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
