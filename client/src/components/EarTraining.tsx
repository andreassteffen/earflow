import React, { useState } from 'react';
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
  const [status, setStatus] = useState<'idle' | 'playing' | 'answered'>('idle');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState<Record<string, { correct: number; incorrect: number }>>({});
  const [tetrachordLength, setTetrachordLength] = useState(4);
  const [allowedStartNotes, setAllowedStartNotes] = useState<string[]>(VALID_START_NOTES.slice());

  const playTetrachord = async (note?: string, silent: boolean = false) => {
    if (!silent) setStatus('playing');
    setShowResult(false);
    setAnswer('');
    await Tone.start();
    const synth = new Tone.Synth().toDestination();

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
    setTimeout(() => setStatus('answered'), totalDuration * 1000);
  };

  const handleGuess = () => {
    if (!correctNote) return;
    const isCorrect = answer.toUpperCase() === correctNote.toUpperCase();
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
  };

  const handlePlayAgain = () => {
    if (correctNote) {
      playTetrachord(correctNote, true);
    }
  };

  const handleNext = () => {
    setAnswer('');
    setCorrectNote(null);
    setShowResult(false);
    setStatus('idle');
    playTetrachord();
  };

  return (
    <div style={{ display: 'flex', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '2rem', flex: 1 }}>
        <h2>🎵 Ear Training: Tetrachord Challenge</h2>
        <p>Score: {score}</p>

        <div style={{ margin: '1rem 0' }}>
          <label>
            🎚️ Anzahl Töne auf-/abwärts: {tetrachordLength}
            <input
              type="range"
              min={1}
              max={7}
              value={tetrachordLength}
              onChange={(e) => setTetrachordLength(parseInt(e.target.value))}
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <p>🎯 Erlaubte Starttöne:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {VALID_START_NOTES.map((note) => (
              <label key={note} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <input
                  type="checkbox"
                  checked={allowedStartNotes.includes(note)}
                  onChange={() => {
                    setAllowedStartNotes((prev) =>
                      prev.includes(note)
                        ? prev.filter((n) => n !== note)
                        : [...prev, note]
                    );
                  }}
                />
                {note}
              </label>
            ))}
          </div>
        </div>

        {status === 'idle' && <button onClick={() => playTetrachord()}>▶️ Play Tetrachord</button>}

        {status === 'answered' && (
          <div>
            <p>What was the first note?</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {VALID_START_NOTES.map((note) => (
                <button
                  key={note}
                  onClick={() => setAnswer(note)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: answer === note ? '#ddd' : '#f0f0f0',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {note}
                </button>
              ))}
            </div>
            <button onClick={handleGuess}>Check</button>
            {showResult && (
              <p>
                {answer.toUpperCase() === correctNote?.toUpperCase()
                  ? '✅ Correct!'
                  : `❌ Incorrect. It was ${correctNote}`}
              </p>
            )}
            <div style={{ marginTop: '1rem' }}>
              <button onClick={handlePlayAgain} style={{ marginRight: '1rem' }}>🔁 Replay</button>
              <button onClick={handleNext}>⏭️ Next</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '2rem', width: '300px', borderLeft: '1px solid #ccc' }}>
        <h3>📊 Stats by Note</h3>
        <ul>
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
