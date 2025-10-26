"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

interface StemUploadProps {
  onUploadComplete: () => void;
}

export default function StemUpload({ onUploadComplete }: StemUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    drums: null as File | null,
    bass: null as File | null,
    melody: null as File | null,
  });

  const handleFileChange = (stemType: 'drums' | 'bass' | 'melody', file: File | null) => {
    setFormData(prev => ({
      ...prev,
      [stemType]: file
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title) {
      setError("Please enter a title for your stem group");
      return;
    }

    if (!formData.drums && !formData.bass && !formData.melody) {
      setError("Please upload at least one stem file");
      return;
    }

    setIsUploading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);

      if (formData.drums) data.append('drums', formData.drums);
      if (formData.bass) data.append('bass', formData.bass);
      if (formData.melody) data.append('melody', formData.melody);

      const response = await fetch('/api/stems/upload', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        drums: null,
        bass: null,
        melody: null,
      });
      setShowForm(false);

      // Notify parent to refresh
      onUploadComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="glass-card p-6">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 bg-gradient-to-r from-plum-600 to-neon-pink rounded-lg hover:from-plum-500 hover:to-neon-pink transition-all shadow-skeu hover:shadow-neon-pink"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">🎛️</span>
            <span className="text-lg font-semibold">Upload Multi-Stem Project</span>
            <span className="text-2xl">🎚️</span>
          </div>
          <p className="text-sm text-gray-300 mt-2">
            Upload up to 3 stems (drums, bass, melody) for advanced mixing
          </p>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gradient-neon">New Stem Group</h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-900/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-300">
              Project Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="My Awesome Track"
              className="skeu-input w-full text-white"
              required
              disabled={isUploading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-300">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your stem group..."
              className="skeu-input w-full text-white h-20 resize-none"
              disabled={isUploading}
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-300">Upload Stems (at least 1 required)</h4>

            {/* Drums Upload */}
            <div className="p-4 bg-dark-elevated rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-2xl">🥁</span>
                  <span className="text-red-400">Drums</span>
                </label>
                {formData.drums && (
                  <button
                    type="button"
                    onClick={() => handleFileChange('drums', null)}
                    className="text-xs text-gray-500 hover:text-gray-400"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileChange('drums', e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-500/20 file:text-red-300 hover:file:bg-red-500/30"
                disabled={isUploading}
              />
              {formData.drums && (
                <p className="text-xs text-gray-500 mt-1">{formData.drums.name}</p>
              )}
            </div>

            {/* Bass Upload */}
            <div className="p-4 bg-dark-elevated rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-2xl">🎸</span>
                  <span className="text-blue-400">Bass</span>
                </label>
                {formData.bass && (
                  <button
                    type="button"
                    onClick={() => handleFileChange('bass', null)}
                    className="text-xs text-gray-500 hover:text-gray-400"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileChange('bass', e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-500/20 file:text-blue-300 hover:file:bg-blue-500/30"
                disabled={isUploading}
              />
              {formData.bass && (
                <p className="text-xs text-gray-500 mt-1">{formData.bass.name}</p>
              )}
            </div>

            {/* Melody Upload */}
            <div className="p-4 bg-dark-elevated rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-2xl">🎹</span>
                  <span className="text-green-400">Melody</span>
                </label>
                {formData.melody && (
                  <button
                    type="button"
                    onClick={() => handleFileChange('melody', null)}
                    className="text-xs text-gray-500 hover:text-gray-400"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileChange('melody', e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-500/20 file:text-green-300 hover:file:bg-green-500/30"
                disabled={isUploading}
              />
              {formData.melody && (
                <p className="text-xs text-gray-500 mt-1">{formData.melody.name}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-3 rounded-lg bg-dark-elevated hover:bg-gray-800 transition-colors text-gray-400"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-lg bg-gradient-to-r from-plum-600 to-neon-pink hover:from-plum-500 hover:to-neon-pink transition-all shadow-skeu hover:shadow-neon-pink disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isUploading || (!formData.drums && !formData.bass && !formData.melody)}
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Uploading Stems...
                </span>
              ) : (
                'Upload Stem Group'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}