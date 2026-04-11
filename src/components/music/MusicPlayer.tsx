import { useState, useEffect, useRef } from 'react';
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

  // Use refs to avoid stale closures in audio event handlers
  const loopModeRef = useRef(loopMode);
  const shuffleRef = useRef(shuffle);
  const currentSongIdRef = useRef(currentSongId);
  const songsRef = useRef(songs);
  const onSongChangeRef = useRef(onSongChange);

  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { currentSongIdRef.current = currentSongId; }, [currentSongId]);
  useEffect(() => { songsRef.current = songs; }, [songs]);
  useEffect(() => { onSongChangeRef.current = onSongChange; }, [onSongChange]);

  const currentSong = songs.find(s => s.id === currentSongId);
  const playableSongs = songs.filter(s => s.file);

  const getNextSongId = (direction: 1 | -1): number | null => {
    const playable = songsRef.current.filter(s => s.file);
    if (playable.length === 0) return null;
    const currentIndex = playable.findIndex(s => s.id === currentSongIdRef.current);
    if (shuffleRef.current && direction === 1) {
      let next: number;
      do { next = Math.floor(Math.random() * playable.length); } while (next === currentIndex && playable.length > 1);
      return playable[next].id;
    }
    let nextIndex = currentIndex + direction;
    if (nextIndex >= playable.length) {
      return loopModeRef.current === 'off' ? null : playable[0].id;
    } else if (nextIndex < 0) {
      return loopModeRef.current === 'off' ? null : playable[playable.length - 1].id;
    }
    return playable[nextIndex].id;
  };

  const handleEnded = () => {
    if (loopModeRef.current === 'one') {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play();
      }
    } else {
      const nextId = getNextSongId(1);
      onSongChangeRef.current(nextId);
    }
  };

  // Load audio when song changes
  useEffect(() => {
    // Clean up previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    }

    if (!currentSong?.file) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const audio = new Audio(currentSong.file);
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('ended', handleEnded);
    audioRef.current = audio;
    audio.play();
    setIsPlaying(true);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
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

  const playNext = () => {
    const nextId = getNextSongId(1);
    onSongChange(nextId);
  };

  const playPrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevId = getNextSongId(-1);
    onSongChange(prevId);
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
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate flex-1">{currentSong.name}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
          if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
          setIsPlaying(false);
          onStop();
        }}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-10 text-right">{formatTime(currentTime)}</span>
        <Slider value={[currentTime]} max={duration || 1} step={0.5} onValueChange={seek} className="flex-1" />
        <span className="w-10">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-center gap-1">
        <Button variant="ghost" size="icon" className={`h-8 w-8 ${shuffle ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setShuffle(!shuffle)}>
          <Shuffle className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => skip(-15)}>
          <Rewind className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playPrev}>
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button variant="default" size="icon" className="h-10 w-10 rounded-full" onClick={togglePlayPause}>
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playNext}>
          <SkipForward className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => skip(15)}>
          <FastForward className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className={`h-8 w-8 ${loopMode !== 'off' ? 'text-primary' : 'text-muted-foreground'}`} onClick={cycleLoop}>
          {loopMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
