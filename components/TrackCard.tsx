"use client";

import { Track } from "@/lib/TracksContext";
import { useState, useRef, useEffect } from "react";
import * as Tone from "tone";

interface TrackCardProps {
  track: Track;
  isOwner: boolean;
  onDelete?: (trackId: string) => void;
}

export default function TrackCard({ track, isOwner, onDelete }: TrackCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pitchShift, setPitchShift] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'mp3' | 'wav' | 'webm'>('mp3');
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  // Effect toggles
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [distortionEnabled, setDistortionEnabled] = useState(false);
  const [chorusEnabled, setChorusEnabled] = useState(false);
  const [envelopeEnabled, setEnvelopeEnabled] = useState(false);

  // Mastering toggles (simple presets) - now supports multiple simultaneous presets
  const [masteringPresets, setMasteringPresets] = useState<string[]>([]);

  // Effect parameters - Better defaults for first-time users
  const [reverbDecay, setReverbDecay] = useState(2.6);
  const [reverbMix, setReverbMix] = useState(0.35);      // 0 = dry, 1 = wet (reduced from 0.5)
  const [delayTime, setDelayTime] = useState(0.25);
  const [delayFeedback, setDelayFeedback] = useState(0.4);
  const [delayMix, setDelayMix] = useState(0.25);        // 0 = dry, 1 = wet (reduced from 0.3)
  const [distortionAmount, setDistortionAmount] = useState(0.25); // FIXED: was 0.8 (way too strong!)
  const [distortionMix, setDistortionMix] = useState(0.2); // 0 = dry, 1 = wet (reduced from 0.5)
  const [chorusDepth, setChorusDepth] = useState(0.23);
  const [chorusFrequency, setChorusFrequency] = useState(1.5);
  const [chorusMix, setChorusMix] = useState(0.23);      // 0 = dry, 1 = wet (reduced from 0.5)

  // ADSR Envelope parameters
  const [attack, setAttack] = useState(0.01);     // Attack time in seconds (0.01 = instant)
  const [decay, setDecay] = useState(0.1);        // Decay time in seconds
  const [sustain, setSustain] = useState(1);      // Sustain level (0-1, 1 = full volume)
  const [release, setRelease] = useState(0.5);    // Release time in seconds

  const playerRef = useRef<Tone.Player | null>(null);
  const pitchShifterRef = useRef<Tone.PitchShift | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const delayRef = useRef<Tone.FeedbackDelay | null>(null);
  const distortionRef = useRef<Tone.Distortion | null>(null);
  const chorusRef = useRef<Tone.Chorus | null>(null);
  const envelopeRef = useRef<Tone.AmplitudeEnvelope | null>(null);

  // Mastering chain (EQ3 for simple mastering)
  const eq3Ref = useRef<Tone.EQ3 | null>(null);

  // Recorder for downloading transformed audio
  const recorderRef = useRef<Tone.Recorder | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Tone.js player and effects chain
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Create effects (all start disconnected/bypassed) with better defaults
        reverbRef.current = new Tone.Reverb({
          decay: 2.6,
          wet: 0.35
        });

        delayRef.current = new Tone.FeedbackDelay({
          delayTime: 0.25,
          feedback: 0.4,
          wet: 0.25
        });

        distortionRef.current = new Tone.Distortion({
          distortion: 0.25,  // Much more reasonable default
          wet: 0.2
        });

        chorusRef.current = new Tone.Chorus({
          frequency: 1.5,
          delayTime: 3.5,
          depth: 0.23,
          wet: 0.23
        });

        // Create mastering EQ3 (3-band EQ)
        eq3Ref.current = new Tone.EQ3({
          low: 0,
          mid: 0,
          high: 0,
          lowFrequency: 400,
          highFrequency: 2500
        });

        // Create ADSR Envelope
        envelopeRef.current = new Tone.AmplitudeEnvelope({
          attack: 0.01,
          decay: 0.1,
          sustain: 1,
          release: 0.5
        });

        // Create recorder for downloading transformed audio
        recorderRef.current = new Tone.Recorder();

        // Create pitch shifter
        pitchShifterRef.current = new Tone.PitchShift({
          pitch: 0,
          windowSize: 0.1,
          delayTime: 0,
          feedback: 0
        });

        // Connect effects chain: Player -> Pitch -> EQ3 (mastering) -> [Effects] -> Destination
        // Connect pitch shifter to EQ3 for mastering
        pitchShifterRef.current.connect(eq3Ref.current);
        // EQ3 will connect to effects or destination
        eq3Ref.current.toDestination();

        // Create player and connect to pitch shifter
        playerRef.current = new Tone.Player({
          url: track.fileUrl,
          loop: true, // Loop by default
          onload: () => {
            if (playerRef.current) {
              setDuration(playerRef.current.buffer.duration);
              console.log('Audio loaded. Duration:', playerRef.current.buffer.duration);
            }
          },
          onerror: (error) => {
            console.error('Failed to load audio:', error);
          }
        }).connect(pitchShifterRef.current);

        // Set playback rate
        playerRef.current.playbackRate = playbackRate;

        // Track progress - will be started when playing
        playerRef.current.onstop = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };

      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };

    initAudio();

    return () => {
      // Cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (playerRef.current) {
        playerRef.current.dispose();
      }
      if (pitchShifterRef.current) {
        pitchShifterRef.current.dispose();
      }
      if (reverbRef.current) {
        reverbRef.current.dispose();
      }
      if (delayRef.current) {
        delayRef.current.dispose();
      }
      if (distortionRef.current) {
        distortionRef.current.dispose();
      }
      if (chorusRef.current) {
        chorusRef.current.dispose();
      }
      if (envelopeRef.current) {
        envelopeRef.current.dispose();
      }
      if (eq3Ref.current) {
        eq3Ref.current.dispose();
      }
      if (recorderRef.current) {
        recorderRef.current.dispose();
      }
    };
  }, [track.fileUrl]);

  // Handle playback rate and pitch shift changes together
  // Speed control (playbackRate) affects pitch, so we compensate automatically
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.playbackRate = playbackRate;
    }

    if (pitchShifterRef.current) {
      // Calculate pitch shift needed to compensate for playback rate
      // playbackRate doubles = +12 semitones, so we need to shift down by that amount
      const pitchCompensation = -12 * Math.log2(playbackRate);

      // Apply user's desired pitch shift + compensation
      const totalPitchShift = pitchShift + pitchCompensation;
      pitchShifterRef.current.pitch = totalPitchShift;
    }
  }, [playbackRate, pitchShift]);

  // Handle loop toggle
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.loop = loopEnabled;
    }
  }, [loopEnabled]);

  // Update effect parameters
  useEffect(() => {
    if (reverbRef.current) {
      reverbRef.current.decay = reverbDecay;
      reverbRef.current.wet.value = reverbMix;
    }
  }, [reverbDecay, reverbMix]);

  useEffect(() => {
    if (delayRef.current) {
      delayRef.current.delayTime.value = delayTime;
      delayRef.current.feedback.value = delayFeedback;
      delayRef.current.wet.value = delayMix;
    }
  }, [delayTime, delayFeedback, delayMix]);

  useEffect(() => {
    if (distortionRef.current) {
      distortionRef.current.distortion = distortionAmount;
      distortionRef.current.wet.value = distortionMix;
    }
  }, [distortionAmount, distortionMix]);

  useEffect(() => {
    if (chorusRef.current) {
      chorusRef.current.depth = chorusDepth;
      chorusRef.current.frequency.value = chorusFrequency;
      chorusRef.current.wet.value = chorusMix;
    }
  }, [chorusDepth, chorusFrequency, chorusMix]);

  // Update ADSR envelope parameters
  useEffect(() => {
    if (envelopeRef.current) {
      envelopeRef.current.attack = attack;
      envelopeRef.current.decay = decay;
      envelopeRef.current.sustain = sustain;
      envelopeRef.current.release = release;
    }
  }, [attack, decay, sustain, release]);

  // Apply mastering presets (supports multiple simultaneous presets, averaged together)
  useEffect(() => {
    if (!eq3Ref.current) return;

    // Define preset values
    const presetValues: Record<string, { low: number; mid: number; high: number }> = {
      warm: { low: 3, mid: -1, high: -2 },
      bright: { low: -2, mid: 1, high: 4 },
      punchy: { low: 4, mid: 2, high: 1 },
      airy: { low: -1, mid: -2, high: 5 },
      balanced: { low: 0, mid: 0, high: 0 }
    };

    if (masteringPresets.length === 0) {
      // No presets selected - reset to flat
      eq3Ref.current.low.value = 0;
      eq3Ref.current.mid.value = 0;
      eq3Ref.current.high.value = 0;
    } else {
      // Calculate average of all selected presets
      let totalLow = 0;
      let totalMid = 0;
      let totalHigh = 0;

      masteringPresets.forEach(preset => {
        const values = presetValues[preset];
        if (values) {
          totalLow += values.low;
          totalMid += values.mid;
          totalHigh += values.high;
        }
      });

      const count = masteringPresets.length;
      eq3Ref.current.low.value = totalLow / count;
      eq3Ref.current.mid.value = totalMid / count;
      eq3Ref.current.high.value = totalHigh / count;
    }
  }, [masteringPresets]);

  // Rebuild audio chain when effects are toggled
  useEffect(() => {
    if (!pitchShifterRef.current || !playerRef.current || !eq3Ref.current || !recorderRef.current) return;

    // Disconnect everything first
    eq3Ref.current.disconnect();
    if (reverbRef.current) reverbRef.current.disconnect();
    if (delayRef.current) delayRef.current.disconnect();
    if (distortionRef.current) distortionRef.current.disconnect();
    if (chorusRef.current) chorusRef.current.disconnect();
    if (envelopeRef.current) envelopeRef.current.disconnect();

    // Build the effects chain: Pitch -> EQ3 -> [Effects] -> Envelope -> Recorder -> Destination
    // Start from EQ3 (mastering is always applied)
    let lastNode: Tone.ToneAudioNode = eq3Ref.current;

    if (reverbEnabled && reverbRef.current) {
      lastNode.connect(reverbRef.current);
      lastNode = reverbRef.current;
    }

    if (delayEnabled && delayRef.current) {
      lastNode.connect(delayRef.current);
      lastNode = delayRef.current;
    }

    if (distortionEnabled && distortionRef.current) {
      lastNode.connect(distortionRef.current);
      lastNode = distortionRef.current;
    }

    if (chorusEnabled && chorusRef.current) {
      lastNode.connect(chorusRef.current);
      lastNode = chorusRef.current;
    }

    if (envelopeEnabled && envelopeRef.current) {
      lastNode.connect(envelopeRef.current);
      lastNode = envelopeRef.current;
    }

    // Connect to recorder and destination
    lastNode.connect(recorderRef.current);
    lastNode.toDestination();

  }, [reverbEnabled, delayEnabled, distortionEnabled, chorusEnabled, envelopeEnabled]);

  const togglePlay = async () => {
    if (!playerRef.current) {
      console.error('Player not initialized');
      return;
    }

    try {
      await Tone.start(); // Start audio context

      if (isPlaying) {
        playerRef.current.stop();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        // Release envelope if enabled
        if (envelopeEnabled && envelopeRef.current) {
          envelopeRef.current.triggerRelease();
        }
        setIsPlaying(false);
      } else {
        console.log('Attempting to play audio from:', track.fileUrl);
        playerRef.current.start();
        setIsPlaying(true);

        // Trigger envelope attack if enabled
        if (envelopeEnabled && envelopeRef.current) {
          envelopeRef.current.triggerAttack();
        }

        // Track playback progress
        intervalRef.current = setInterval(() => {
          if (playerRef.current && playerRef.current.state === "started") {
            // Approximate current time based on Tone.now()
            const elapsed = Tone.now() - (playerRef.current as any)._startTime || 0;
            setCurrentTime(elapsed);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
      alert('Failed to play audio. Check console for details.');
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    const wasPlaying = isPlaying;
    if (wasPlaying) {
      playerRef.current.stop();
    }

    playerRef.current.start(0, newTime);
    setCurrentTime(newTime);

    if (!wasPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadOriginal = async () => {
    try {
      // Simple direct download of the original file
      const response = await fetch(track.fileUrl);
      const blob = await response.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = track.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download:', error);
      alert('Failed to download file');
    }
  };

  const downloadTransformed = async () => {
    if (!playerRef.current || !recorderRef.current || !duration) {
      alert('Audio not ready for download');
      return;
    }

    // Check if any effects are actually enabled
    const hasEffects = reverbEnabled || delayEnabled || distortionEnabled || chorusEnabled || envelopeEnabled ||
                       masteringPresets.length > 0 || playbackRate !== 1 || pitchShift !== 0;

    if (!hasEffects) {
      // No effects applied, just download the original file
      downloadOriginal();
      return;
    }

    try {
      setIsRecording(true);

      // Store original loop state
      const wasLooping = loopEnabled;
      const wasPlaying = isPlaying;

      // Stop playback and disable loop
      if (wasPlaying) {
        playerRef.current.stop();
      }
      playerRef.current.loop = false;

      // Determine MIME type based on selected format
      let mimeType = 'audio/webm';
      let fileExtension = 'webm';

      if (downloadFormat === 'mp3') {
        // Try mp3, but not all browsers support it
        if (MediaRecorder.isTypeSupported('audio/mpeg')) {
          mimeType = 'audio/mpeg';
          fileExtension = 'mp3';
        } else {
          console.warn('MP3 encoding not supported, falling back to WAV');
          downloadFormat === 'wav' ? (mimeType = 'audio/wav', fileExtension = 'wav') : null;
        }
      } else if (downloadFormat === 'wav') {
        if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
          fileExtension = 'wav';
        } else {
          console.warn('WAV encoding not supported, using WebM');
        }
      }

      // Create a new recorder with the specified format
      const formatRecorder = new Tone.Recorder({ mimeType });

      // Reconnect the audio chain to the new recorder
      const lastEffectNode = envelopeRef.current && envelopeEnabled ? envelopeRef.current :
                            chorusRef.current && chorusEnabled ? chorusRef.current :
                            distortionRef.current && distortionEnabled ? distortionRef.current :
                            delayRef.current && delayEnabled ? delayRef.current :
                            reverbRef.current && reverbEnabled ? reverbRef.current :
                            eq3Ref.current;

      if (lastEffectNode) {
        lastEffectNode.connect(formatRecorder);
      }

      // Start recording
      await Tone.start();
      formatRecorder.start();

      // Play track from beginning to end
      playerRef.current.start();

      // Trigger envelope if enabled
      if (envelopeEnabled && envelopeRef.current) {
        envelopeRef.current.triggerAttack();
      }

      // Wait for playback to complete (accounting for playback rate)
      const recordDuration = (duration / playbackRate) * 1000;
      await new Promise(resolve => setTimeout(resolve, recordDuration + 500));

      // Stop recording
      const recording = await formatRecorder.stop();

      // Disconnect and dispose the temporary recorder
      formatRecorder.dispose();

      // Create download link
      const url = URL.createObjectURL(recording);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.title}_transformed.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Restore original state
      playerRef.current.loop = wasLooping;
      if (!wasPlaying) {
        playerRef.current.stop();
      }

      setIsRecording(false);
      setShowFormatMenu(false);
    } catch (error) {
      console.error('Failed to download:', error);
      alert('Failed to download transformed audio');
      setIsRecording(false);
    }
  };

  return (
    <div className={`glass-card p-6 space-y-4 hover:border-plum-400/30 transition-all ${showFormatMenu ? 'relative z-[10000]' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-gradient-plum truncate">
            {track.title}
          </h3>
          <p className="text-sm text-gray-500 truncate">{track.filename}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 bg-dark-elevated px-2 py-1 rounded">
            {track.format}
          </span>
          {isOwner && onDelete && (
            <button
              onClick={() => onDelete(track.id)}
              className="text-gray-500 hover:text-neon-pink transition-colors p-1"
              title="Delete track"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Waveform / Progress Bar */}
      <div
        className="h-16 waveform-container cursor-pointer"
        onClick={handleSeek}
      >
        <div className="h-full flex items-end justify-center gap-0.5 relative">
          {/* Simple waveform visualization */}
          {[...Array(40)].map((_, i) => {
            const height = Math.random() * 60 + 20;
            const progress = duration > 0 ? currentTime / duration : 0;
            const isPast = i / 40 < progress;

            return (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-colors ${
                  isPast ? 'bg-neon-blue' : 'bg-gray-600'
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-plum-600 to-plum-800 hover:from-plum-500 hover:to-plum-700 transition-all shadow-skeu hover:shadow-neon-pink flex items-center justify-center text-2xl"
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>

        {/* Windows XP Style Loop Button */}
        <button
          onClick={() => setLoopEnabled(!loopEnabled)}
          className={`relative w-10 h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-lg ${
            loopEnabled
              ? 'xp-button-active shadow-[inset_0_2px_8px_rgba(59,130,246,0.6),0_0_12px_rgba(59,130,246,0.4)]'
              : 'xp-button shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,0,0,0.3)]'
          }`}
          title={loopEnabled ? "Loop: ON" : "Loop: OFF"}
        >
          <span className={`transition-all ${loopEnabled ? 'text-blue-200 drop-shadow-[0_0_4px_rgba(96,165,250,0.8)]' : 'text-gray-400'}`}>
            🔁
          </span>
          {loopEnabled && (
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-400/20 to-blue-600/20 pointer-events-none" />
          )}
        </button>

        <div className="flex-1 text-sm text-gray-400">
          <span className="text-neon-blue">{formatTime(currentTime)}</span>
          <span className="mx-2">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <button
          onClick={() => setShowControls(!showControls)}
          className="text-xs px-3 py-1.5 rounded bg-dark-elevated hover:bg-plum-900/30 text-gray-400 hover:text-neon-seafoam transition-colors"
          title="Audio transformations"
        >
          🎛️ FX
        </button>

        <div className={`relative ${showFormatMenu ? 'z-[10000]' : ''}`}>
          <div className="flex gap-1">
            <button
              onClick={downloadTransformed}
              disabled={isRecording || !duration}
              className={`text-xs px-3 py-1.5 rounded-l transition-colors ${
                isRecording
                  ? 'bg-neon-pink/30 text-neon-pink cursor-wait'
                  : 'bg-dark-elevated hover:bg-plum-900/30 text-gray-400 hover:text-neon-blue'
              }`}
              title="Download with all effects applied"
            >
              {isRecording ? '⏺️ Recording...' : `⬇️ ${downloadFormat.toUpperCase()}`}
            </button>
            <button
              onClick={() => setShowFormatMenu(!showFormatMenu)}
              disabled={isRecording || !duration}
              className={`text-xs px-2 py-1.5 rounded-r transition-colors border-l border-gray-700 ${
                isRecording
                  ? 'bg-neon-pink/30 text-neon-pink cursor-wait'
                  : 'bg-dark-elevated hover:bg-plum-900/30 text-gray-400 hover:text-neon-blue'
              }`}
              title="Select download format"
            >
              ▼
            </button>
          </div>

          {showFormatMenu && (
            <div className="absolute left-full ml-2 top-0 bg-dark-elevated border border-plum-500/30 rounded-lg shadow-xl z-[9999] overflow-hidden min-w-[100px]">
              <button
                onClick={() => { setDownloadFormat('mp3'); setShowFormatMenu(false); }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-plum-900/30 transition-colors ${
                  downloadFormat === 'mp3' ? 'text-neon-blue' : 'text-gray-400'
                }`}
              >
                MP3 {downloadFormat === 'mp3' && '✓'}
              </button>
              <button
                onClick={() => { setDownloadFormat('wav'); setShowFormatMenu(false); }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-plum-900/30 transition-colors ${
                  downloadFormat === 'wav' ? 'text-neon-blue' : 'text-gray-400'
                }`}
              >
                WAV {downloadFormat === 'wav' && '✓'}
              </button>
              <button
                onClick={() => { setDownloadFormat('webm'); setShowFormatMenu(false); }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-plum-900/30 transition-colors ${
                  downloadFormat === 'webm' ? 'text-neon-blue' : 'text-gray-400'
                }`}
              >
                WEBM {downloadFormat === 'webm' && '✓'}
              </button>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-600">
          {formatFileSize(track.fileSize)}
        </div>
      </div>

      {/* Audio Transformation Controls */}
      {showControls && (
        <div className="pt-4 border-t border-plum-500/20 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Speed Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Speed</label>
                <span className="text-xs text-neon-blue font-mono">
                  {playbackRate.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.05"
                value={playbackRate}
                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-neon-blue"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>0.25x</span>
                <button
                  onClick={() => setPlaybackRate(1)}
                  className="text-neon-seafoam hover:text-neon-pink transition-colors"
                >
                  reset
                </button>
                <span>2.0x</span>
              </div>
            </div>

            {/* Pitch Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Pitch</label>
                <span className="text-xs text-neon-pink font-mono">
                  {pitchShift > 0 ? '+' : ''}{pitchShift} semitones
                </span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={pitchShift}
                onChange={(e) => setPitchShift(parseInt(e.target.value))}
                className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-neon-pink"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>-12</span>
                <button
                  onClick={() => setPitchShift(0)}
                  className="text-neon-seafoam hover:text-neon-pink transition-colors"
                >
                  reset
                </button>
                <span>+12</span>
              </div>
            </div>
          </div>

          {/* Hot Buttons for Effects */}
          <div className="pt-4 border-t border-plum-500/20">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-gray-400">Effects</label>
              <button
                onClick={() => {
                  setReverbEnabled(false);
                  setDelayEnabled(false);
                  setDistortionEnabled(false);
                  setChorusEnabled(false);
                  setEnvelopeEnabled(false);
                }}
                className="text-xs text-gray-500 hover:text-neon-seafoam transition-colors"
              >
                clear all
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Reverb */}
              <button
                onClick={() => setReverbEnabled(!reverbEnabled)}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  reverbEnabled
                    ? 'bg-neon-blue text-dark-base shadow-neon-blue border border-neon-blue'
                    : 'bg-dark-elevated text-gray-400 hover:bg-plum-900/30 hover:text-neon-blue border border-transparent'
                }`}
              >
                <div className="text-lg mb-1">🌊</div>
                <div className="text-xs">Reverb</div>
              </button>

              {/* Delay */}
              <button
                onClick={() => setDelayEnabled(!delayEnabled)}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  delayEnabled
                    ? 'bg-neon-seafoam text-dark-base shadow-neon-seafoam border border-neon-seafoam'
                    : 'bg-dark-elevated text-gray-400 hover:bg-plum-900/30 hover:text-neon-seafoam border border-transparent'
                }`}
              >
                <div className="text-lg mb-1">⏱️</div>
                <div className="text-xs">Delay</div>
              </button>

              {/* Distortion */}
              <button
                onClick={() => setDistortionEnabled(!distortionEnabled)}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  distortionEnabled
                    ? 'bg-neon-pink text-dark-base shadow-neon-pink border border-neon-pink'
                    : 'bg-dark-elevated text-gray-400 hover:bg-plum-900/30 hover:text-neon-pink border border-transparent'
                }`}
              >
                <div className="text-lg mb-1">⚡</div>
                <div className="text-xs">Distortion</div>
              </button>

              {/* Chorus */}
              <button
                onClick={() => setChorusEnabled(!chorusEnabled)}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  chorusEnabled
                    ? 'bg-plum-400 text-dark-base shadow-lg border border-plum-400'
                    : 'bg-dark-elevated text-gray-400 hover:bg-plum-900/30 hover:text-plum-400 border border-transparent'
                }`}
              >
                <div className="text-lg mb-1">✨</div>
                <div className="text-xs">Chorus</div>
              </button>

              {/* ADSR Envelope */}
              <button
                onClick={() => setEnvelopeEnabled(!envelopeEnabled)}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  envelopeEnabled
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-600 text-dark-base shadow-lg border border-orange-500'
                    : 'bg-dark-elevated text-gray-400 hover:bg-orange-900/30 hover:text-orange-400 border border-transparent'
                }`}
              >
                <div className="text-lg mb-1">📈</div>
                <div className="text-xs">ADSR</div>
              </button>
            </div>

            {/* Modular Parameter Controls for Active Effects */}
            {(reverbEnabled || delayEnabled || distortionEnabled || chorusEnabled || envelopeEnabled) && (
              <div className="mt-6 space-y-4">
                {/* Reverb Parameters - Kid-Friendly Design */}
                {reverbEnabled && (
                  <div className="p-4 rounded-lg bg-neon-blue/10 border border-neon-blue/30 space-y-3">
                    <div className="text-sm font-medium text-neon-blue flex items-center gap-2">
                      <span>🌊</span> Space Vibe
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Room Size</span>
                          <span className="text-neon-blue font-mono">
                            {reverbDecay < 1 ? '🚪 Tiny' : reverbDecay < 3 ? '🏠 Room' : reverbDecay < 6 ? '🏛️ Hall' : '🏔️ Canyon'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={reverbDecay}
                          onChange={(e) => setReverbDecay(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-neon-blue"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>🚪</span>
                          <span>🏠</span>
                          <span>🏛️</span>
                          <span>🏔️</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Effect Amount</span>
                          <span className="text-neon-blue font-mono">{Math.round(reverbMix * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={reverbMix}
                          onChange={(e) => setReverbMix(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-neon-blue"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>Less</span>
                          <span>More</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delay Parameters - Kid-Friendly Design */}
                {delayEnabled && (
                  <div className="p-4 rounded-lg bg-neon-seafoam/10 border border-neon-seafoam/30 space-y-3">
                    <div className="text-sm font-medium text-neon-seafoam flex items-center gap-2">
                      <span>⏱️</span> Echo Magic
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Echo Gap</span>
                          <span className="text-neon-seafoam font-mono">
                            {delayTime < 0.15 ? '💨 Quick' : delayTime < 0.4 ? '👏 Normal' : '🦥 Slow'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.01"
                          max="1"
                          step="0.01"
                          value={delayTime}
                          onChange={(e) => setDelayTime(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-neon-seafoam"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>💨</span>
                          <span>👏</span>
                          <span>🦥</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Repeats</span>
                          <span className="text-neon-seafoam font-mono">
                            {delayFeedback < 0.3 ? '🔂 Few' : delayFeedback < 0.7 ? '🔁 Some' : '♾️ Many'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.95"
                          step="0.01"
                          value={delayFeedback}
                          onChange={(e) => setDelayFeedback(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-neon-seafoam"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>🔂</span>
                          <span>🔁</span>
                          <span>♾️</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Effect Amount</span>
                          <span className="text-neon-seafoam font-mono">{Math.round(delayMix * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={delayMix}
                          onChange={(e) => setDelayMix(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-neon-seafoam"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>Less</span>
                          <span>More</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Distortion Parameters - Kid-Friendly Design */}
                {distortionEnabled && (
                  <div className="p-4 rounded-lg bg-neon-pink/10 border border-neon-pink/30 space-y-3">
                    <div className="text-sm font-medium text-neon-pink flex items-center gap-2">
                      <span>⚡</span> Crunch Power
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Grit Level</span>
                          <span className="text-neon-pink font-mono">
                            {distortionAmount < 0.2 ? '🎸 Soft' : distortionAmount < 0.5 ? '🔥 Medium' : distortionAmount < 0.8 ? '⚡ Heavy' : '💀 Extreme'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={distortionAmount}
                          onChange={(e) => setDistortionAmount(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-neon-pink"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>🎸</span>
                          <span>🔥</span>
                          <span>⚡</span>
                          <span>💀</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Effect Amount</span>
                          <span className="text-neon-pink font-mono">{Math.round(distortionMix * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={distortionMix}
                          onChange={(e) => setDistortionMix(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-neon-pink"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>Less</span>
                          <span>More</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chorus Parameters - Kid-Friendly Design */}
                {chorusEnabled && (
                  <div className="p-4 rounded-lg bg-plum-400/10 border border-plum-400/30 space-y-3">
                    <div className="text-sm font-medium text-plum-400 flex items-center gap-2">
                      <span>✨</span> Sparkle Magic
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Wobble Speed</span>
                          <span className="text-plum-400 font-mono">
                            {chorusFrequency < 2 ? '🐌 Slow' : chorusFrequency < 5 ? '🐇 Medium' : '🚀 Fast'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={chorusFrequency}
                          onChange={(e) => setChorusFrequency(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-plum-400"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>🐌</span>
                          <span>🐇</span>
                          <span>🚀</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Shimmer</span>
                          <span className="text-plum-400 font-mono">{(chorusDepth * 100).toFixed(0)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={chorusDepth}
                          onChange={(e) => setChorusDepth(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-plum-400"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>Subtle</span>
                          <span>Intense</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Effect Amount</span>
                          <span className="text-plum-400 font-mono">{Math.round(chorusMix * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={chorusMix}
                          onChange={(e) => setChorusMix(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-plum-400"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>Less</span>
                          <span>More</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ADSR Envelope Parameters */}
                {envelopeEnabled && (
                  <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-orange-500/30 space-y-3">
                    <div className="text-sm font-medium text-orange-400 flex items-center gap-2">
                      <span>📈</span> ADSR Envelope Shaper
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Attack */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Attack</span>
                          <span className="text-orange-400 font-mono">
                            {attack < 0.05 ? '⚡ Instant' : attack < 0.5 ? '🏃 Fast' : attack < 2 ? '🚶 Slow' : '🐌 Gradual'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.01"
                          value={attack}
                          onChange={(e) => setAttack(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-orange-400"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>0s</span>
                          <span>{attack.toFixed(2)}s</span>
                          <span>5s</span>
                        </div>
                      </div>

                      {/* Decay */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Decay</span>
                          <span className="text-orange-400 font-mono">
                            {decay < 0.1 ? '💨 Quick' : decay < 0.5 ? '📉 Medium' : '🎿 Long'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.01"
                          value={decay}
                          onChange={(e) => setDecay(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-orange-400"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>0s</span>
                          <span>{decay.toFixed(2)}s</span>
                          <span>2s</span>
                        </div>
                      </div>

                      {/* Sustain */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Sustain</span>
                          <span className="text-orange-400 font-mono">
                            {Math.round(sustain * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={sustain}
                          onChange={(e) => setSustain(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-orange-400"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>Silent</span>
                          <span>Half</span>
                          <span>Full</span>
                        </div>
                      </div>

                      {/* Release */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Release</span>
                          <span className="text-orange-400 font-mono">
                            {release < 0.2 ? '✂️ Cut' : release < 1 ? '🎵 Fade' : release < 3 ? '☁️ Soft' : '🌊 Long'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.01"
                          value={release}
                          onChange={(e) => setRelease(parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-orange-400"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>0s</span>
                          <span>{release.toFixed(2)}s</span>
                          <span>10s</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual ADSR curve representation */}
                    <div className="mt-4 p-3 bg-dark-elevated rounded-lg">
                      <div className="text-xs text-gray-500 mb-2">Envelope Shape Preview</div>
                      <svg width="100%" height="60" viewBox="0 0 200 60" className="overflow-visible">
                        {/* Grid lines */}
                        <line x1="0" y1="60" x2="200" y2="60" stroke="#444" strokeWidth="1"/>

                        {/* ADSR Curve */}
                        <path
                          d={`M 0,60
                              L ${attack * 20},10
                              L ${attack * 20 + decay * 20},${60 - sustain * 50}
                              L 150,${60 - sustain * 50}
                              L ${150 + release * 10},60`}
                          fill="none"
                          stroke="url(#adsrGradient)"
                          strokeWidth="2"
                        />

                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="adsrGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#ea580c" />
                          </linearGradient>
                        </defs>

                        {/* Labels */}
                        <text x={attack * 10} y="55" fill="#888" fontSize="8">A</text>
                        <text x={attack * 20 + decay * 10} y="55" fill="#888" fontSize="8">D</text>
                        <text x="100" y="55" fill="#888" fontSize="8">S</text>
                        <text x="160" y="55" fill="#888" fontSize="8">R</text>
                      </svg>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      🎹 Shape how your sound evolves over time
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mastering Presets Section */}
          <div className="pt-4 border-t border-plum-500/20">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-gray-400">✨ Mastering</label>
              {masteringPresets.length > 0 && (
                <button
                  onClick={() => setMasteringPresets([])}
                  className="text-xs text-gray-500 hover:text-neon-seafoam transition-colors"
                >
                  clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {/* Warm Preset */}
              <button
                onClick={() => {
                  setMasteringPresets(prev =>
                    prev.includes('warm')
                      ? prev.filter(p => p !== 'warm')
                      : [...prev, 'warm']
                  );
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  masteringPresets.includes('warm')
                    ? 'bg-orange-500/30 text-orange-200 border border-orange-400/50'
                    : 'bg-dark-elevated text-gray-400 hover:bg-orange-900/20 hover:text-orange-300 border border-transparent'
                }`}
              >
                🔥 Warm
              </button>

              {/* Bright Preset */}
              <button
                onClick={() => {
                  setMasteringPresets(prev =>
                    prev.includes('bright')
                      ? prev.filter(p => p !== 'bright')
                      : [...prev, 'bright']
                  );
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  masteringPresets.includes('bright')
                    ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50'
                    : 'bg-dark-elevated text-gray-400 hover:bg-yellow-900/20 hover:text-yellow-300 border border-transparent'
                }`}
              >
                ☀️ Bright
              </button>

              {/* Punchy Preset */}
              <button
                onClick={() => {
                  setMasteringPresets(prev =>
                    prev.includes('punchy')
                      ? prev.filter(p => p !== 'punchy')
                      : [...prev, 'punchy']
                  );
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  masteringPresets.includes('punchy')
                    ? 'bg-red-500/30 text-red-200 border border-red-400/50'
                    : 'bg-dark-elevated text-gray-400 hover:bg-red-900/20 hover:text-red-300 border border-transparent'
                }`}
              >
                💥 Punchy
              </button>

              {/* Airy Preset */}
              <button
                onClick={() => {
                  setMasteringPresets(prev =>
                    prev.includes('airy')
                      ? prev.filter(p => p !== 'airy')
                      : [...prev, 'airy']
                  );
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  masteringPresets.includes('airy')
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50'
                    : 'bg-dark-elevated text-gray-400 hover:bg-cyan-900/20 hover:text-cyan-300 border border-transparent'
                }`}
              >
                💨 Airy
              </button>

              {/* Balanced Preset */}
              <button
                onClick={() => {
                  setMasteringPresets(prev =>
                    prev.includes('balanced')
                      ? prev.filter(p => p !== 'balanced')
                      : [...prev, 'balanced']
                  );
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  masteringPresets.includes('balanced')
                    ? 'bg-green-500/30 text-green-200 border border-green-400/50'
                    : 'bg-dark-elevated text-gray-400 hover:bg-green-900/20 hover:text-green-300 border border-transparent'
                }`}
              >
                ⚖️ Balanced
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center">
              {masteringPresets.length > 1
                ? `Combining ${masteringPresets.length} presets - EQ values averaged together`
                : 'Select multiple presets to combine their EQ curves'}
            </p>
          </div>

          <div className="text-xs text-gray-500 italic text-center pt-4">
            Powered by Tone.js - Independent pitch and tempo control
          </div>
        </div>
      )}
    </div>
  );
}
