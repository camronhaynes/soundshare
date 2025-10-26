"use client";

import { useState, useRef, useEffect } from "react";
import * as Tone from "tone";

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
  stems: Stem[];
  user?: {
    id: string;
    username: string;
    name: string;
  };
}

interface StemPlayerRef {
  player: Tone.Player;
  volume: Tone.Volume;
  eq: Tone.EQ3;
  reverb: Tone.Reverb;
  delay: Tone.FeedbackDelay;
  distortion: Tone.Distortion;
  envelope: Tone.AmplitudeEnvelope;
  pitchShift: Tone.PitchShift;
}

interface MultiTrackPlayerProps {
  stemGroup: StemGroup;
  isOwner: boolean;
}

export default function MultiTrackPlayer({ stemGroup, isOwner }: MultiTrackPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Per-stem controls state
  const [stemStates, setStemStates] = useState<{[key: string]: {
    muted: boolean;
    solo: boolean;
    volume: number;
    pan: number;
    lowGain: number;
    midGain: number;
    highGain: number;
    reverbEnabled: boolean;
    reverbMix: number;
    delayEnabled: boolean;
    delayTime: number;
    delayFeedback: number;
    delayMix: number;
    distortionEnabled: boolean;
    distortionAmount: number;
    pitchShift: number;
    // ADSR
    envelopeEnabled: boolean;
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  }}>({});

  const stemPlayersRef = useRef<{[key: string]: StemPlayerRef}>({});
  const transportRef = useRef<typeof Tone.Transport | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize all stem players
  useEffect(() => {
    const initializeStems = async () => {
      setIsLoading(true);

      // Start audio context on first user interaction
      try {
        await Tone.start();
        console.log('Audio context started');
      } catch (e) {
        console.error('Failed to start audio context:', e);
      }

      // Stop and clean up any existing players
      Object.values(stemPlayersRef.current).forEach(stem => {
        stem.player.dispose();
        stem.volume.dispose();
        stem.eq.dispose();
        stem.reverb.dispose();
        stem.delay.dispose();
        stem.distortion.dispose();
        stem.envelope.dispose();
        stem.pitchShift.dispose();
      });
      stemPlayersRef.current = {};

      // Initialize transport
      transportRef.current = Tone.Transport;
      Tone.Transport.stop();
      Tone.Transport.cancel();

      let maxDuration = 0;
      const initialStates: typeof stemStates = {};
      let loadedCount = 0;
      const totalStems = stemGroup.stems.length;

      // Create players for each stem
      for (const stem of stemGroup.stems) {
        try {
          // Create effects chain for this stem
          const volume = new Tone.Volume(0);
          const panner = new Tone.Panner(0);
          const eq = new Tone.EQ3({
            low: 0,
            mid: 0,
            high: 0,
            lowFrequency: 400,
            highFrequency: 2500
          });
          const reverb = new Tone.Reverb({
            decay: 2.6,
            wet: 0
          });
          const delay = new Tone.FeedbackDelay({
            delayTime: 0.25,
            feedback: 0.4,
            wet: 0
          });
          const distortion = new Tone.Distortion({
            distortion: 0.25,
            wet: 0
          });
          const envelope = new Tone.AmplitudeEnvelope({
            attack: 0.01,
            decay: 0.1,
            sustain: 1,
            release: 0.5
          });
          const pitchShift = new Tone.PitchShift({
            pitch: 0,
            windowSize: 0.1,
            delayTime: 0,
            feedback: 0
          });

          // Create player
          console.log(`Creating player for stem: ${stem.title}, ID: ${stem.id}`);
          const player = new Tone.Player({
            url: `/api/stems/stream/${stem.id}`,
            loop: true,
            onload: () => {
              console.log(`Successfully loaded stem: ${stem.title}`);
              loadedCount++;
              if (player.buffer.duration > maxDuration) {
                maxDuration = player.buffer.duration;
                setDuration(maxDuration);
              }
              if (loadedCount === totalStems) {
                console.log('All stems loaded successfully');
                setIsLoading(false);
              }
            },
            onerror: (error) => {
              console.error(`Failed to load stem ${stem.title}:`, error);
              loadedCount++;
              if (loadedCount === totalStems) {
                setIsLoading(false);
              }
            }
          });

          // Connect the chain: Player -> PitchShift -> Volume -> Panner -> EQ -> Effects -> Envelope -> Output
          player.connect(pitchShift);
          pitchShift.connect(volume);
          volume.connect(panner);
          panner.connect(eq);

          // Effects are connected in parallel with dry signal
          eq.connect(reverb);
          eq.connect(delay);
          eq.connect(distortion);
          eq.connect(envelope);

          // All effects connect to destination
          reverb.toDestination();
          delay.toDestination();
          distortion.toDestination();
          envelope.toDestination();
          eq.toDestination(); // Dry signal

          // Store the player reference
          stemPlayersRef.current[stem.id] = {
            player,
            volume,
            eq,
            reverb,
            delay,
            distortion,
            envelope,
            pitchShift
          };

          // Initialize state for this stem
          initialStates[stem.id] = {
            muted: false,
            solo: false,
            volume: 0,
            pan: 0,
            lowGain: 0,
            midGain: 0,
            highGain: 0,
            reverbEnabled: false,
            reverbMix: 0.35,
            delayEnabled: false,
            delayTime: 0.25,
            delayFeedback: 0.4,
            delayMix: 0.25,
            distortionEnabled: false,
            distortionAmount: 0.25,
            pitchShift: 0,
            envelopeEnabled: false,
            attack: 0.01,
            decay: 0.1,
            sustain: 1,
            release: 0.5,
          };

          // Initialize volume mute state (unmuted by default)
          volume.mute = false;
        } catch (error) {
          console.error(`Error initializing stem ${stem.title}:`, error);
        }
      }

      setStemStates(initialStates);
    };

    initializeStems();

    return () => {
      // Cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      Object.values(stemPlayersRef.current).forEach(stem => {
        try {
          stem.player.dispose();
          stem.volume.dispose();
          stem.eq.dispose();
          stem.reverb.dispose();
          stem.delay.dispose();
          stem.distortion.dispose();
          stem.envelope.dispose();
          stem.pitchShift.dispose();
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    };
  }, [stemGroup.id]); // Re-initialize when stem group changes

  // Handle play/pause
  const togglePlay = async () => {
    if (isLoading) return;

    try {
      await Tone.start();

      if (isPlaying) {
        // Stop all players
        Object.values(stemPlayersRef.current).forEach(stem => {
          stem.player.stop();
          if (stemStates[stem.player.name]?.envelopeEnabled) {
            stem.envelope.triggerRelease();
          }
        });

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        setIsPlaying(false);
        setCurrentTime(0);
      } else {
        // Start all players simultaneously (even muted ones for sync)
        const now = Tone.now();
        const hasSolo = Object.values(stemStates).some(s => s.solo);

        Object.entries(stemPlayersRef.current).forEach(([stemId, stem]) => {
          const state = stemStates[stemId];

          // Always start the player for perfect sync
          stem.player.start(now);

          // Apply mute/solo state via volume control
          if (hasSolo) {
            // If any track is solo'd, only solo'd tracks are audible
            stem.volume.mute = state?.solo ? (state?.muted || false) : true;
          } else {
            // If no tracks are solo'd, respect individual mute states
            stem.volume.mute = state?.muted || false;
          }

          if (state?.envelopeEnabled && !stem.volume.mute) {
            stem.envelope.triggerAttack(now);
          }
        });

        setIsPlaying(true);

        // Track playback progress
        intervalRef.current = setInterval(() => {
          const firstPlayer = Object.values(stemPlayersRef.current)[0]?.player;
          if (firstPlayer && firstPlayer.state === "started") {
            const elapsed = Tone.now() - now;
            setCurrentTime(elapsed % duration);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Playback error:', error);
      setIsPlaying(false);
    }
  };

  // Update stem parameters
  const updateStemParam = (stemId: string, param: string, value: any) => {
    setStemStates(prev => ({
      ...prev,
      [stemId]: {
        ...prev[stemId],
        [param]: value
      }
    }));

    const stem = stemPlayersRef.current[stemId];
    if (!stem) return;

    // Apply the parameter change
    switch(param) {
      case 'volume':
        stem.volume.volume.value = value;
        break;
      case 'muted':
        // Mute by setting volume to -Infinity (complete silence)
        // This keeps the track playing but silent, maintaining perfect sync
        if (value) {
          stem.volume.mute = true;  // Use Tone.js built-in mute
        } else {
          stem.volume.mute = false; // Unmute restores previous volume
        }
        break;
      case 'solo':
        // Handle solo logic using volume control
        // All tracks keep playing but only audible ones produce sound
        const newStates = {
          ...stemStates,
          [stemId]: { ...stemStates[stemId], solo: value }
        };
        const hasSolo = Object.values(newStates).some((s: any) => s.solo);

        // Update volume/mute state for all stems based on solo
        Object.entries(stemPlayersRef.current).forEach(([id, s]) => {
          const state = newStates[id];

          if (hasSolo) {
            // If any track is solo'd, only solo'd tracks are audible
            if (state?.solo) {
              s.volume.mute = state?.muted || false;
            } else {
              s.volume.mute = true;  // Mute non-solo'd tracks
            }
          } else {
            // If no tracks are solo'd, respect individual mute states
            s.volume.mute = state?.muted || false;
          }
        });
        break;
      case 'lowGain':
        stem.eq.low.value = value;
        break;
      case 'midGain':
        stem.eq.mid.value = value;
        break;
      case 'highGain':
        stem.eq.high.value = value;
        break;
      case 'reverbEnabled':
        stem.reverb.wet.value = value ? stemStates[stemId].reverbMix : 0;
        break;
      case 'reverbMix':
        if (stemStates[stemId].reverbEnabled) {
          stem.reverb.wet.value = value;
        }
        break;
      case 'delayEnabled':
        stem.delay.wet.value = value ? stemStates[stemId].delayMix : 0;
        break;
      case 'delayTime':
        stem.delay.delayTime.value = value;
        break;
      case 'delayFeedback':
        stem.delay.feedback.value = value;
        break;
      case 'delayMix':
        if (stemStates[stemId].delayEnabled) {
          stem.delay.wet.value = value;
        }
        break;
      case 'distortionEnabled':
        stem.distortion.wet.value = value ? 0.5 : 0;
        break;
      case 'distortionAmount':
        stem.distortion.distortion = value;
        break;
      case 'pitchShift':
        stem.pitchShift.pitch = value;
        break;
      case 'attack':
        stem.envelope.attack = value;
        break;
      case 'decay':
        stem.envelope.decay = value;
        break;
      case 'sustain':
        stem.envelope.sustain = value;
        break;
      case 'release':
        stem.envelope.release = value;
        break;
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStemColor = (stemType: string) => {
    switch(stemType) {
      case 'drums': return 'from-red-500 to-orange-600';
      case 'bass': return 'from-blue-500 to-cyan-600';
      case 'melody': return 'from-green-500 to-emerald-600';
      case 'vocals': return 'from-purple-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gradient-neon">{stemGroup.title}</h2>
          {stemGroup.description && (
            <p className="text-gray-400 mt-1">{stemGroup.description}</p>
          )}
          {stemGroup.user && (
            <p className="text-sm text-gray-500 mt-2">by {stemGroup.user.name}</p>
          )}
        </div>

        {/* Master Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className={`w-12 h-12 rounded-full transition-all flex items-center justify-center text-2xl ${
              isLoading
                ? 'bg-gray-700 cursor-wait'
                : 'bg-gradient-to-br from-plum-600 to-plum-800 hover:from-plum-500 hover:to-plum-700 shadow-skeu hover:shadow-neon-pink'
            }`}
          >
            {isLoading ? '⏳' : isPlaying ? '⏸' : '▶️'}
          </button>

          <div className="text-sm text-gray-400">
            <span className="text-neon-blue">{formatTime(currentTime)}</span>
            <span className="mx-2">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-dark-elevated rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-neon-blue to-neon-pink transition-all"
          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      {/* Stem Lanes */}
      <div className="space-y-4">
        {stemGroup.stems.map((stem) => {
          const state = stemStates[stem.id] || {};

          return (
            <div key={stem.id} className="p-4 bg-dark-elevated rounded-lg space-y-4">
              {/* Stem Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-12 rounded-full bg-gradient-to-b ${getStemColor(stem.stemType)}`} />
                  <div>
                    <h3 className="font-semibold text-gray-200">{stem.title}</h3>
                    <p className="text-xs text-gray-500">{stem.filename}</p>
                  </div>
                </div>

                {/* Basic Controls */}
                <div className="flex items-center gap-3">
                  {/* Mute */}
                  <button
                    onClick={() => updateStemParam(stem.id, 'muted', !state.muted)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      state.muted
                        ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                        : 'bg-dark-base text-gray-400 hover:text-gray-300 border border-gray-700'
                    }`}
                  >
                    {state.muted ? '🔇 Muted' : '🔊 Mute'}
                  </button>

                  {/* Solo */}
                  <button
                    onClick={() => updateStemParam(stem.id, 'solo', !state.solo)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      state.solo
                        ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50'
                        : 'bg-dark-base text-gray-400 hover:text-gray-300 border border-gray-700'
                    }`}
                  >
                    {state.solo ? '⭐ Solo' : '👤 Solo'}
                  </button>
                </div>
              </div>

              {/* Volume & Basic EQ */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Volume */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Volume</span>
                    <span className="text-neon-blue font-mono">{state.volume || 0}dB</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="12"
                    step="1"
                    value={state.volume || 0}
                    onChange={(e) => updateStemParam(stem.id, 'volume', parseFloat(e.target.value))}
                    className="w-full h-2 bg-dark-base rounded-lg appearance-none cursor-pointer accent-neon-blue"
                  />
                </div>

                {/* EQ Low */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Low</span>
                    <span className="text-orange-400 font-mono">{state.lowGain || 0}dB</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="1"
                    value={state.lowGain || 0}
                    onChange={(e) => updateStemParam(stem.id, 'lowGain', parseFloat(e.target.value))}
                    className="w-full h-2 bg-dark-base rounded-lg appearance-none cursor-pointer accent-orange-400"
                  />
                </div>

                {/* EQ Mid */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Mid</span>
                    <span className="text-green-400 font-mono">{state.midGain || 0}dB</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="1"
                    value={state.midGain || 0}
                    onChange={(e) => updateStemParam(stem.id, 'midGain', parseFloat(e.target.value))}
                    className="w-full h-2 bg-dark-base rounded-lg appearance-none cursor-pointer accent-green-400"
                  />
                </div>

                {/* EQ High */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">High</span>
                    <span className="text-cyan-400 font-mono">{state.highGain || 0}dB</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="1"
                    value={state.highGain || 0}
                    onChange={(e) => updateStemParam(stem.id, 'highGain', parseFloat(e.target.value))}
                    className="w-full h-2 bg-dark-base rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>

              {/* Effects Row - Toggles */}
              <div className="flex flex-wrap gap-2">
                {/* Reverb Toggle */}
                <button
                  onClick={() => updateStemParam(stem.id, 'reverbEnabled', !state.reverbEnabled)}
                  className={`px-3 py-1 rounded text-xs transition-all ${
                    state.reverbEnabled
                      ? 'bg-neon-blue text-dark-base'
                      : 'bg-dark-base text-gray-400 hover:text-gray-300'
                  }`}
                >
                  🌊 Reverb
                </button>

                {/* Delay Toggle */}
                <button
                  onClick={() => updateStemParam(stem.id, 'delayEnabled', !state.delayEnabled)}
                  className={`px-3 py-1 rounded text-xs transition-all ${
                    state.delayEnabled
                      ? 'bg-neon-seafoam text-dark-base'
                      : 'bg-dark-base text-gray-400 hover:text-gray-300'
                  }`}
                >
                  ⏱️ Delay
                </button>

                {/* Distortion Toggle */}
                <button
                  onClick={() => updateStemParam(stem.id, 'distortionEnabled', !state.distortionEnabled)}
                  className={`px-3 py-1 rounded text-xs transition-all ${
                    state.distortionEnabled
                      ? 'bg-neon-pink text-dark-base'
                      : 'bg-dark-base text-gray-400 hover:text-gray-300'
                  }`}
                >
                  ⚡ Distortion
                </button>

                {/* Envelope Toggle */}
                <button
                  onClick={() => updateStemParam(stem.id, 'envelopeEnabled', !state.envelopeEnabled)}
                  className={`px-3 py-1 rounded text-xs transition-all ${
                    state.envelopeEnabled
                      ? 'bg-orange-500 text-dark-base'
                      : 'bg-dark-base text-gray-400 hover:text-gray-300'
                  }`}
                >
                  📈 ADSR
                </button>

                {/* Pitch Shift */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Pitch:</span>
                  <input
                    type="number"
                    min="-12"
                    max="12"
                    value={state.pitchShift || 0}
                    onChange={(e) => updateStemParam(stem.id, 'pitchShift', parseInt(e.target.value))}
                    className="w-16 px-2 py-1 text-xs bg-dark-base border border-gray-700 rounded text-gray-300"
                  />
                  <span className="text-xs text-gray-500">st</span>
                </div>
              </div>

              {/* Modular Parameter Controls for Active Effects */}
              {(state.reverbEnabled || state.delayEnabled || state.distortionEnabled || state.envelopeEnabled) && (
                <div className="mt-2 space-y-3">
                  {/* Reverb Parameters - Kid-Friendly Design */}
                  {state.reverbEnabled && (
                    <div className="p-3 rounded-lg bg-neon-blue/10 border border-neon-blue/30 space-y-3">
                      <div className="text-xs font-medium text-neon-blue flex items-center gap-2">
                        <span>🌊</span> Space Vibe
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Room Size</span>
                          <span className="text-neon-blue font-mono">{Math.round((state.reverbMix || 0.35) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={state.reverbMix || 0.35}
                          onChange={(e) => updateStemParam(stem.id, 'reverbMix', parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-base rounded-lg appearance-none cursor-pointer accent-neon-blue"
                        />
                      </div>
                    </div>
                  )}

                  {/* Delay Parameters - Kid-Friendly Design */}
                  {state.delayEnabled && (
                    <div className="p-3 rounded-lg bg-neon-seafoam/10 border border-neon-seafoam/30 space-y-3">
                      <div className="text-xs font-medium text-neon-seafoam flex items-center gap-2">
                        <span>⏱️</span> Echo Magic
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-400">Time</div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={state.delayTime || 0.25}
                            onChange={(e) => updateStemParam(stem.id, 'delayTime', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-dark-base rounded-lg appearance-none cursor-pointer accent-neon-seafoam"
                          />
                          <div className="text-xs text-center text-neon-seafoam font-mono">
                            {((state.delayTime || 0.25) * 1000).toFixed(0)}ms
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-400">Feedback</div>
                          <input
                            type="range"
                            min="0"
                            max="0.95"
                            step="0.05"
                            value={state.delayFeedback || 0.4}
                            onChange={(e) => updateStemParam(stem.id, 'delayFeedback', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-dark-base rounded-lg appearance-none cursor-pointer accent-neon-seafoam"
                          />
                          <div className="text-xs text-center text-neon-seafoam font-mono">
                            {Math.round((state.delayFeedback || 0.4) * 100)}%
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-400">Mix</div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={state.delayMix || 0.25}
                            onChange={(e) => updateStemParam(stem.id, 'delayMix', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-dark-base rounded-lg appearance-none cursor-pointer accent-neon-seafoam"
                          />
                          <div className="text-xs text-center text-neon-seafoam font-mono">
                            {Math.round((state.delayMix || 0.25) * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Distortion Parameters - Kid-Friendly Design */}
                  {state.distortionEnabled && (
                    <div className="p-3 rounded-lg bg-neon-pink/10 border border-neon-pink/30 space-y-3">
                      <div className="text-xs font-medium text-neon-pink flex items-center gap-2">
                        <span>⚡</span> Crunch Power
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Amount</span>
                          <span className="text-neon-pink font-mono">{Math.round((state.distortionAmount || 0.25) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={state.distortionAmount || 0.25}
                          onChange={(e) => updateStemParam(stem.id, 'distortionAmount', parseFloat(e.target.value))}
                          className="w-full h-2 bg-dark-base rounded-lg appearance-none cursor-pointer accent-neon-pink"
                        />
                      </div>
                    </div>
                  )}

                  {/* ADSR Envelope - Kid-Friendly Design */}
                  {state.envelopeEnabled && (
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 space-y-3">
                      <div className="text-xs font-medium text-orange-400 flex items-center gap-2">
                        <span>📈</span> Shape Control
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-400">Attack</div>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.01"
                            value={state.attack || 0.01}
                            onChange={(e) => updateStemParam(stem.id, 'attack', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-dark-base rounded-lg appearance-none cursor-pointer accent-orange-400"
                          />
                          <div className="text-xs text-center text-orange-400 font-mono">
                            {(state.attack || 0.01).toFixed(2)}s
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-400">Decay</div>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.01"
                            value={state.decay || 0.1}
                            onChange={(e) => updateStemParam(stem.id, 'decay', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-dark-base rounded-lg appearance-none cursor-pointer accent-orange-400"
                          />
                          <div className="text-xs text-center text-orange-400 font-mono">
                            {(state.decay || 0.1).toFixed(2)}s
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-400">Sustain</div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={state.sustain || 1}
                            onChange={(e) => updateStemParam(stem.id, 'sustain', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-dark-base rounded-lg appearance-none cursor-pointer accent-orange-400"
                          />
                          <div className="text-xs text-center text-orange-400 font-mono">
                            {Math.round((state.sustain || 1) * 100)}%
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-400">Release</div>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.01"
                            value={state.release || 0.5}
                            onChange={(e) => updateStemParam(stem.id, 'release', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-dark-base rounded-lg appearance-none cursor-pointer accent-orange-400"
                          />
                          <div className="text-xs text-center text-orange-400 font-mono">
                            {(state.release || 0.5).toFixed(2)}s
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}