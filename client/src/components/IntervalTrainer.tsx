import React, { useState, useEffect } from 'react';
import * as Tone from 'tone';

const intervals = [
  { name: 'Prime', semitones: 0, song: { name: 'Alle meine Entchen', notes: ['C4', 'C4', 'C4', 'C4'] } },
  { name: 'Minor 2nd', semitones: 1, song: { name: 'Hänsel und Gretel', notes: ['C4', 'Db4', 'C4', 'Db4'] } },
  { name: 'Major 2nd', semitones: 2, song: { name: 'Fuchs, du hast die Gans gestohlen', notes: ['C4', 'D4', 'E4', 'D4'] } },
  { name: 'Minor 3rd', semitones: 3, song: { name: 'Bruder Jakob', notes: ['C4', 'Eb4', 'G4', 'C4'] } },
  { name: 'Major 3rd', semitones: 4, song: { name: 'Kuckuck, Kuckuck', notes: ['C4', 'E4', 'G4', 'E4'] } },
  { name: 'Perfect 4th', semitones: 5, song: { name: 'Es tanzt ein Bi-Ba-Butzemann', notes: ['C4', 'F4', 'G4', 'C4'] } },
  { name: 'Tritone', semitones: 6, song: { name: 'Die Gedanken sind frei', notes: ['C4', 'F#4', 'G4', 'C4'] } },
  { name: 'Perfect 5th', semitones: 7, song: { name: 'Der Mond ist aufgegangen', notes: ['C4', 'G4', 'C4', 'G4'] } },
  { name: 'Minor 6th', semitones: 8, song: { name: 'Ein Männlein steht im Walde', notes: ['C4', 'Ab4', 'G4', 'C4'] } },
  { name: 'Major 6th', semitones: 9, song: { name: 'Mein Hut, der hat drei Ecken', notes: ['C4', 'A4', 'G4', 'C4'] } },
  { name: 'Minor 7th', semitones: 10, song: { name: 'Hoppe, hoppe Reiter', notes: ['C4', 'Bb4', 'A4', 'C4'] } },
  { name: 'Major 7th', semitones: 11, song: { name: 'Kommt ein Vogel geflogen', notes: ['C4', 'B4', 'C5', 'C4'] } },
  { name: 'Octave', semitones: 12, song: { name: 'O Tannenbaum', notes: ['C4', 'C5', 'C4', 'C4'] } },
];

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface IntervalStats {
  attempts: number;
  correct: number;
}

const IntervalTrainer: React.FC = () => {
  const [currentInterval, setCurrentInterval] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [currentNotes, setCurrentNotes] = useState<{ pitch: string; duration: string; }[]>([]);
  const [isAscending, setIsAscending] = useState<boolean>(true);
  const [sampler, setSampler] = useState<Tone.Sampler | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [shouldGenerateNewInterval, setShouldGenerateNewInterval] = useState(false);
  const [intervalStats, setIntervalStats] = useState<IntervalStats[]>(
    intervals.map(() => ({ attempts: 0, correct: 0 }))
  );
  const [showStats, setShowStats] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Initialize the piano sampler
    const piano = new Tone.Sampler({
      urls: {
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
      },
      release: 1,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).toDestination();

    // Load the samples
    Tone.loaded().then(() => {
      setSampler(piano);
      setIsLoading(false);
      generateRandomInterval();
    });

    return () => {
      piano.dispose();
    };
  }, []);

  useEffect(() => {
    if (shouldGenerateNewInterval) {
      generateRandomInterval();
      setShouldGenerateNewInterval(false);
    }
  }, [shouldGenerateNewInterval]);

  const getRandomStartingNote = () => {
    const octave = Math.floor(Math.random() * 2) + 3; // Random between 3 and 4
    const noteIndex = Math.floor(Math.random() * noteNames.length);
    return `${noteNames[noteIndex]}${octave}`;
  };

  const getIntervalNote = (startNote: string, semitones: number, ascending: boolean) => {
    // For prime interval, always return the same note
    if (semitones === 0) {
      return startNote;
    }

    const startPitch = startNote.replace(/\d+/, '');
    const startOctave = parseInt(startNote.match(/\d+/)?.[0] || '4');
    const startIndex = noteNames.indexOf(startPitch);
    
    let targetIndex, targetOctave;
    
    if (ascending) {
      // For ascending intervals
      const totalSemitones = startIndex + semitones;
      targetIndex = totalSemitones % 12;
      targetOctave = startOctave + Math.floor(totalSemitones / 12);
    } else {
      // For descending intervals
      const totalSemitones = startIndex - semitones;
      targetIndex = ((totalSemitones % 12) + 12) % 12;
      targetOctave = startOctave + Math.floor(totalSemitones / 12);
    }
    
    return `${noteNames[targetIndex]}${targetOctave}`;
  };

  const playNotes = async () => {
    if (currentNotes.length === 0 || !sampler) return;
    
    await Tone.start();
    
    // Debug logging
    console.log('Playing notes:', {
      firstNote: currentNotes[0].pitch,
      secondNote: currentNotes[1].pitch,
      currentInterval: intervals[currentInterval]
    });
    
    // Play the first note
    sampler.triggerAttackRelease(currentNotes[0].pitch, '4n', Tone.now());
    // Play the second note after a quarter note duration
    sampler.triggerAttackRelease(currentNotes[1].pitch, '4n', Tone.now() + 0.5);
  };

  const getWeightedRandomInterval = () => {
    // Calculate weights based on success rate
    const weights = intervalStats.map(stat => {
      if (stat.attempts === 0) return 1; // Default weight for untested intervals
      const successRate = stat.correct / stat.attempts;
      // Lower success rate = higher weight
      return 1 - successRate;
    });

    // Normalize weights
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const normalizedWeights = weights.map(weight => weight / totalWeight);

    // Select interval based on weights
    let random = Math.random();
    let selectedIndex = 0;
    for (let i = 0; i < normalizedWeights.length; i++) {
      random -= normalizedWeights[i];
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    return selectedIndex;
  };

  const generateRandomInterval = async () => {
    const randomIndex = getWeightedRandomInterval();
    const randomAscending = intervals[randomIndex].semitones === 0 ? true : Math.random() > 0.5;
    
    const startNote = getRandomStartingNote();
    const intervalNote = getIntervalNote(
      startNote,
      intervals[randomIndex].semitones,
      randomAscending
    );
    
    const newNotes = [
      { pitch: startNote, duration: '4n' },
      { pitch: intervalNote, duration: '4n' }
    ];
    
    setCurrentInterval(randomIndex);
    setIsAscending(randomAscending);
    setFeedback('');
    setCurrentNotes(newNotes);
  };

  // Play notes whenever currentNotes changes
  useEffect(() => {
    if (currentNotes.length > 0 && !isLoading) {
      playNotes();
    }
  }, [currentNotes, isLoading]);

  const checkAnswer = (selectedInterval: number) => {
    setAttempts(prev => prev + 1);
    
    // Update statistics for the current interval
    setIntervalStats(prev => {
      const newStats = [...prev];
      newStats[currentInterval] = {
        attempts: newStats[currentInterval].attempts + 1,
        correct: selectedInterval === currentInterval 
          ? newStats[currentInterval].correct + 1 
          : newStats[currentInterval].correct
      };
      return newStats;
    });

    if (selectedInterval === currentInterval) {
      setScore(prev => prev + 1);
      setFeedback('Correct!');
      setTimeout(() => {
        setFeedback('');
        setShouldGenerateNewInterval(true);
      }, 1500);
    } else {
      setFeedback(`Incorrect. The correct answer was ${intervals[currentInterval].name}`);
    }
  };

  const playHint = async () => {
    if (!sampler) return;
    
    const interval = intervals[currentInterval];
    const startNote = currentNotes[0].pitch;
    const startPitch = startNote.replace(/\d+/, '');
    const startOctave = parseInt(startNote.match(/\d+/)?.[0] || '4');
    const startIndex = noteNames.indexOf(startPitch);
    
    // Get the original song notes
    let notes = [...interval.song.notes];
    
    // If descending, reverse the notes
    if (!isAscending) {
      notes = notes.reverse();
    }
    
    // Transpose the notes to match our start note
    const originalFirstNote = notes[0];
    const originalPitch = originalFirstNote.replace(/\d+/, '');
    const originalOctave = parseInt(originalFirstNote.match(/\d+/)?.[0] || '4');
    const originalIndex = noteNames.indexOf(originalPitch);
    
    // Calculate the semitone difference between the original first note and our start note
    const semitoneDiff = (startIndex - originalIndex) + ((startOctave - originalOctave) * 12);
    
    // Transpose all notes
    notes = notes.map(note => {
      const pitch = note.replace(/\d+/, '');
      const octave = parseInt(note.match(/\d+/)?.[0] || '4');
      const noteIndex = noteNames.indexOf(pitch);
      const totalSemitones = noteIndex + semitoneDiff;
      const targetIndex = ((totalSemitones % 12) + 12) % 12;
      const targetOctave = octave + Math.floor(totalSemitones / 12);
      return `${noteNames[targetIndex]}${targetOctave}`;
    });
    
    await Tone.start();
    
    // Play the hint notes
    notes.forEach((note, i) => {
      sampler.triggerAttackRelease(note, '8n', Tone.now() + i * 0.3);
    });
    
    setShowHint(true);
    setTimeout(() => setShowHint(false), 5000); // Hide hint after 5 seconds
  };

  if (isLoading) {
    return <div>Loading piano samples...</div>;
  }

  return (
    <div className="interval-trainer">
      <h2>Interval Trainer</h2>
      <div className="score">
        Score: {score}/{attempts}
        <button 
          onClick={() => setShowStats(!showStats)} 
          className="stats-toggle"
        >
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </button>
      </div>
      
      {showStats && (
        <div className="stats-panel">
          <h3>Interval Statistics</h3>
          <div className="stats-grid">
            {intervals.map((interval, index) => {
              const stats = intervalStats[index];
              const successRate = stats.attempts > 0 
                ? Math.round((stats.correct / stats.attempts) * 100) 
                : 0;
              
              return (
                <div key={interval.name} className="stat-item">
                  <div className="stat-name">{interval.name}</div>
                  <div className="stat-bar-container">
                    <div 
                      className="stat-bar" 
                      style={{ width: `${successRate}%` }}
                    />
                  </div>
                  <div className="stat-numbers">
                    {stats.correct}/{stats.attempts} ({successRate}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="play-controls">
        <button onClick={playNotes} className="play-button">▶️ Play Again</button>
        <button onClick={generateRandomInterval} className="new-interval-button">🔄 New Interval</button>
        <button onClick={playHint} className="hint-button">💡 Hint</button>
      </div>

      {showHint && (
        <div className="hint-panel">
          <p>This interval is from: <strong>{intervals[currentInterval].song.name}</strong></p>
        </div>
      )}

      <div className="options">
        {intervals.map((interval, index) => (
          <button
            key={interval.name}
            onClick={() => checkAnswer(index)}
            className="interval-option"
          >
            {interval.name}
          </button>
        ))}
      </div>
      <div className="feedback">{feedback}</div>
    </div>
  );
};

export default IntervalTrainer; 