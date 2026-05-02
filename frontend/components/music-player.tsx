"use client";

import { useState, useRef, useEffect } from "react";
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from "lucide-react";

const playlist = [
  {
    name: "Lo-Fi Chill",
    artist: "Lo-Fi Beats",
    // Free lo-fi music from a public source
    url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  },
  {
    name: "Coding Mode",
    artist: "Electronic Vibes",
    url: "https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3",
  },
  {
    name: "Night Drive",
    artist: "Synthwave",
    url: "https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3",
  },
  {
    name: "Peaceful Mind",
    artist: "Ambient",
    url: "https://cdn.pixabay.com/audio/2022/02/07/audio_6590347820.mp3",
  },
];

export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => {
      setCurrentTrack((prev) => (prev + 1) % playlist.length);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = playlist[currentTrack].url;
      if (isPlaying) audioRef.current.play();
    }
  }, [currentTrack]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      await audioRef.current.play();
    }
    const next = !isPlaying;
    setIsPlaying(next);
    localStorage.setItem("musicPlaying", next ? "true" : "false");
  };

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % playlist.length);
    setIsPlaying(true);
    localStorage.setItem("musicPlaying", "true");
  };

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
    localStorage.setItem("musicPlaying", "true");
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <audio ref={audioRef} preload="metadata" />

      {/* Floating Music Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Expanded Player */}
        {isExpanded && (
          <div className="mb-2 w-80 rounded-2xl border bg-card/90 backdrop-blur-xl shadow-2xl overflow-hidden animate-scale-in glow-card">
            {/* Track Info */}
            <div className="p-4 bg-gradient-to-r from-rose-500/10 to-orange-400/10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shadow-lg ${isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }}>
                    <Music className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{playlist[currentTrack].name}</p>
                  <p className="text-xs text-muted-foreground truncate">{playlist[currentTrack].artist}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all"
                    style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 p-4">
              <button onClick={prevTrack} className="p-2 rounded-full hover:bg-muted transition-colors">
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={togglePlay}
                className="p-3 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
              <button onClick={nextTrack} className="p-2 rounded-full hover:bg-muted transition-colors">
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 px-4 pb-4">
              <button onClick={toggleMute} className="p-1 hover:bg-muted rounded-full transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                className="flex-1 h-1 rounded-full appearance-none bg-muted accent-rose-500"
              />
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl ${
            isPlaying
              ? "bg-gradient-to-r from-rose-500 to-orange-400 text-white animate-glow"
              : "bg-card/90 backdrop-blur-xl border text-muted-foreground"
          }`}
        >
          <Music className="h-5 w-5" />
          {isPlaying && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
          )}
        </button>
      </div>
    </>
  );
}
