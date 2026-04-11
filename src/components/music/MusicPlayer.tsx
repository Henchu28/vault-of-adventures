import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, X,
  Rewind, FastForward
} from 'lucide-react';

interface Song {
  id: number;
  name: string;
  file: string | null;
}

type LoopMode = 'off' | 'all' | 'one';

interface MusicPlayerProps {
  songs: Song[];
  currentSongId: number | null;
  onSongChange: (songId: number | null) => void;
  onStop: () => void;
}

export default function MusicPlayer({ songs, currentSongId, onSongChange, onStop }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [loopMode, setLoopMode] = useState<LoopMode>('off');

  const currentSong = songs.find(s => s.id === currentSongId);

  // Playable songs only
  const playableSongs = songs.filter(s => s.file);

  const createAudio = useCallback((song: Song) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (!song.file) return;
    const audio = new Audio(song.file);
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('ended', () => handleSongEnd());
    audioRef.current = audio;
    audio.play();
    setIsPlaying(true);
  }, []);

  // Handle song end based on loop mode
  const handleSongEnd = useCallback(() => {
    if (loopMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      playNext();
    }
  }, [loopMode, shuffle, playableSongs, currentSongId]);

  // Re-attach ended listener when loopMode/shuffle changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handler = () => handleSongEnd();
    audio.removeEventListener('ended', handler);
    // Remove old, add new
    const oldHandlers = (audio as any).__endHandler;
    if (oldHandlers) audio.removeEventListener('ended', oldHandlers);
    audio.addEventListener('ended', handler);
    (audio as any).__endHandler = handler;
  }, [handleSongEnd]);

  // Load audio when song changes
  useEffect(() => {
    if (currentSong) {
      createAudio(currentSong);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
    return () => {
      // cleanup on unmount only
    };
  }, [currentSongId]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const seek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds));
    }
  };

  const getNextIndex = (direction: 1 | -1): number => {
    if (playableSongs.length === 0) return -1;
    const currentIndex = playableSongs.findIndex(s => s.id === currentSongId);
    if (shuffle && direction === 1) {
      let next: number;
      do { next = Math.floor(Math.random() * playableSongs.length); } while (next === currentIndex && playableSongs.length > 1);
      return next;
    }
    let nextIndex = currentIndex + direction;
    if (nextIndex >= playableSongs.length) {
      nextIndex = loopMode === 'off' ? -1 : 0;
    } else if (nextIndex < 0) {
      nextIndex = loopMode === 'off' ? -1 : playableSongs.length - 1;
    }
    return nextIndex;
  };

  const playNext = () => {
    const idx = getNextIndex(1);
    if (idx === -1) {
      onSongChange(null);
    } else {
      onSongChange(playableSongs[idx].id);
    }
  };

  const playPrev = () => {
    // If more than 3 seconds in, restart song
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const idx = getNextIndex(-1);
    if (idx === -1) {
      onSongChange(null);
    } else {
      onSongChange(playableSongs[idx].id);
    }
  };

  const cycleLoop = () => {
    setLoopMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      {/* Header: song name + stop */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate flex-1">{currentSong.name}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
          audioRef.current?.pause();
          audioRef.current = null;
          setIsPlaying(false);
          onStop();
        }}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Seek slider */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-10 text-right">{formatTime(currentTime)}</span>
        <Slider
          value={[currentTime]}
          max={duration || 1}
          step={0.5}
          onValueChange={seek}
          className="flex-1"
        />
        <span className="w-10">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-1">
        {/* Shuffle */}
        <Button variant="ghost" size="icon" className={`h-8 w-8 ${shuffle ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setShuffle(!shuffle)}>
          <Shuffle className="w-4 h-4" />
        </Button>

        {/* Rewind 15s */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => skip(-15)}>
          <Rewind className="w-4 h-4" />
        </Button>

        {/* Previous */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playPrev}>
          <SkipBack className="w-4 h-4" />
        </Button>

        {/* Play/Pause */}
        <Button variant="default" size="icon" className="h-10 w-10 rounded-full" onClick={togglePlayPause}>
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>

        {/* Next */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playNext}>
          <SkipForward className="w-4 h-4" />
        </Button>

        {/* Forward 15s */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => skip(15)}>
          <FastForward className="w-4 h-4" />
        </Button>

        {/* Loop */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${loopMode !== 'off' ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={cycleLoop}
        >
          {loopMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
