// EarTraining.tsx
import React, { useState, useRef } from 'react';
import * as Tone from 'tone';

const SCALE_NOTES = ['G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];
const VALID_START_NOTES = SCALE_NOTES.slice(SCALE_NOTES.indexOf('C4'), SCALE_NOTES.indexOf('B4') + 1);

function chooseWeightedRandom(
  stats: Record<string, { correct: number; incorrect: number }>,
  allowed: string[],
  tetrachordLength: number
): string {
  const valid = allowed.filter((note) => {
    const i = SCALE_NOTES.indexOf(note);
    return i >= 0 && i + tetrachordLength - 1 < SCALE_NOTES.length && i - (tetrachordLength - 1) >= 0;
  });

  const weights = valid.map((note) => {
    const stat = stats[note] || { correct: 0, incorrect: 0 };
    const weight = 1 + stat.incorrect - stat.correct * 0.5;
    return Math.max(weight, 0.1);
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let r = Math.random() * totalWeight;

  for (let i = 0; i < valid.length; i++) {
    r -= weights[i];
    if (r <= 0) return valid[i];
  }

  return valid[valid.length - 1];
}

const EarTraining: React.FC = () => {
  const [answer, setAnswer] = useState('');
  const [correctNote, setCorrectNote] = useState<string | null>(null);
  const [status, setStatus] = useState<'start' | 'idle' | 'playing' | 'answered'>('start');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState<Record<string, { correct: number; incorrect: number }>>({});
  const [tetrachordLength, setTetrachordLength] = useState(4);
  const [allowedStartNotes, setAllowedStartNotes] = useState<string[]>(VALID_START_NOTES.slice());
  const [showSettings, setShowSettings] = useState(false);
  const currentTransportId = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSynths = useRef<Tone.Synth[]>([]);

  const stopCurrentPlayback = () => {
    if (currentTransportId.current !== null) {
      Tone.Transport.clear(currentTransportId.current);
      currentTransportId.current = null;
    }
    Tone.Transport.stop();
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    activeSynths.current.forEach((s) => {
      try {
        s.dispose();
      } catch {}
    });
    activeSynths.current = [];
  };

  const playTetrachord = async (note?: string, silent: boolean = false, synth?: Tone.Synth) => {
    stopCurrentPlayback();
    setStatus('playing');
    setShowResult(false);
    setAnswer('');

    await Tone.start();
    if (!synth) synth = new Tone.Synth().toDestination();
    activeSynths.current.push(synth);

    const root = note || chooseWeightedRandom(stats, allowedStartNotes, tetrachordLength);
    setCorrectNote(root);

    const index = SCALE_NOTES.indexOf(root);
    const ascending = SCALE_NOTES.slice(index, index + tetrachordLength);
    const descending = SCALE_NOTES.slice(index - tetrachordLength + 1, index + 1).reverse();

    const noteDuration = 0.5;
    const pauseBetween = 0.3;
    const now = Tone.now();

    ascending.forEach((note, i) => {
      synth.triggerAttackRelease(note, `${noteDuration}s`, now + i * (noteDuration + 0.1));
    });

    const startTime = now + ascending.length * (noteDuration + 0.1) + pauseBetween;
    descending.forEach((note, i) => {
      synth.triggerAttackRelease(note, `${noteDuration}s`, startTime + i * (noteDuration + 0.1));
    });

    const totalDuration = ascending.length * (noteDuration + 0.1) + pauseBetween + descending.length * (noteDuration + 0.1);
    timeoutRef.current = setTimeout(() => setStatus('answered'), totalDuration * 1000);
    currentTransportId.current = Tone.Transport.schedule(() => {
      setStatus('answered');
    }, totalDuration);
    Tone.Transport.start();
  };

  const handleGuess = (selected: string) => {
    if (!correctNote) return;
    setAnswer(selected);
    const isCorrect = selected === correctNote;
    if (isCorrect) setScore((s) => s + 1);
    setShowResult(true);
    setStats((prev) => {
      const current = prev[correctNote] || { correct: 0, incorrect: 0 };
      return {
        ...prev,
        [correctNote]: {
          correct: current.correct + (isCorrect ? 1 : 0),
          incorrect: current.incorrect + (isCorrect ? 0 : 1),
        },
      };
    });
    if (isCorrect) {
      stopCurrentPlayback();
      setTimeout(() => handleNext(), 1000);
    }
  };

  const handlePlayAgain = async () => {
    if (correctNote) {
      const synth = new Tone.Synth().toDestination();
      playTetrachord(correctNote, true, synth);
    }
  };

  const handleNext = async () => {
    stopCurrentPlayback();
    setAnswer('');
    setCorrectNote(null);
    setShowResult(false);
    setStatus('idle');
    const synth = new Tone.Synth().toDestination();
    playTetrachord(undefined, false, synth);
  };

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">🎵 Gehörtraining</h2>
        <button onClick={() => setShowSettings(!showSettings)} className="text-2xl">⚙️</button>
      </div>

      {status === 'playing' && <div className="animate-pulse text-lg text-blue-600 mb-2">🎶 Spielt ab…</div>}

      {showSettings && (
        <div className="border rounded-lg p-4 mb-4">
          <label className="block mb-2">
            🎚️ Anzahl Töne auf-/abwärts: {tetrachordLength}
            <input
              type="range"
              min={1}
              max={7}
              value={tetrachordLength}
              onChange={(e) => setTetrachordLength(parseInt(e.target.value))}
              className="w-full"
            />
          </label>
          <p className="font-medium">🎯 Erlaubte Starttöne:</p>
          <div className="flex flex-wrap gap-2">
            {VALID_START_NOTES.map((note) => (
              <label key={note} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={allowedStartNotes.includes(note)}
                  onChange={() => {
                    setAllowedStartNotes((prev) =>
                      prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]
                    );
                  }}
                />
                {note}
              </label>
            ))}
          </div>
        </div>
      )}

      <p className="mb-4 text-lg">🎯 Punktestand: <strong>{score}</strong></p>

      {status === 'start' && (
        <button onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded mb-4">🎬 Starte Challenge</button>
      )}

      {(status === 'answered' || status === 'playing') && (
        <div className="mb-4">
          <p className="mb-2">Welcher war der erste Ton?</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {VALID_START_NOTES.map((note) => (
              <button
                key={note}
                onClick={() => handleGuess(note)}
                className={`px-3 py-2 border rounded ${answer === note ? 'bg-gray-300' : 'bg-gray-100'}`}
              >
                {note}
              </button>
            ))}
          </div>
          {!showResult || answer.toUpperCase() !== correctNote?.toUpperCase() ? (
            <button onClick={handlePlayAgain} className="mb-4 px-4 py-2 border rounded">🔁 Nochmal hören</button>
          ) : null}
          {showResult && (
            <p className="text-lg">
              {answer.toUpperCase() === correctNote?.toUpperCase()
                ? '✅ Richtig!'
                : `❌ Falsch. Versuch es nochmal.`}
            </p>
          )}
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-semibold text-lg mb-2">📊 Statistik</h3>
        <ul className="list-disc list-inside">
          {VALID_START_NOTES.map((note) => {
            const stat = stats[note] || { correct: 0, incorrect: 0 };
            return (
              <li key={note}>
                <strong>{note}</strong>: ✅ {stat.correct} / ❌ {stat.incorrect}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default EarTraining;