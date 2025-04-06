import React, { useEffect, useRef } from 'react';
import Flow from 'vexflow';

interface Note {
  pitch: string;
  duration: string;
}

interface VexFlowScoreProps {
  notes: Note[];
}

const VexFlowScore: React.FC<VexFlowScoreProps> = ({ notes }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = ''; // Clear any previous content

    const VF = Flow;
    const renderer = new VF.Renderer(containerRef.current, VF.Renderer.Backends.SVG);
    renderer.resize(500, 200);
    const context = renderer.getContext();

    const stave = new VF.Stave(10, 40, 400);
    stave.addClef('treble').addTimeSignature('4/4');
    stave.setContext(context).draw();

    try {
      // Convert to VexFlow StaveNotes
      const vexNotes = notes.map((note) => {
        // Convert Tone.js format (C4) to VexFlow format (c/4)
        const pitch = note.pitch.toLowerCase();
        const octave = pitch.match(/\d+/)?.[0] || '4';
        const noteName = pitch.replace(/\d+/, '');
        
        // Handle sharps and flats
        let key = noteName;
        if (noteName.includes('#')) {
          key = noteName.replace('#', '/#');
        } else {
          key = noteName + '/';
        }
        key += octave;
        
        const staveNote = new VF.StaveNote({ 
          keys: [key], 
          duration: note.duration,
          clef: 'treble'
        });

        // Add accidental if needed
        if (noteName.includes('#')) {
          const accidental = new VF.Accidental('#'); // Create the accidental
          staveNote.addModifier(accidental, 0); // Add it to the note
        }

        return staveNote;
      });

      // Calculate total beats in the notes
      const totalBeats = notes.reduce((sum, note) => {
        const duration = note.duration;
        if (duration === 'q') return sum + 1;
        if (duration === 'h') return sum + 2;
        if (duration === 'w') return sum + 4;
        return sum;
      }, 0);

      const voice = new VF.Voice({ numBeats: totalBeats, beatValue: 4 });
      voice.addTickables(vexNotes);
      new VF.Formatter().joinVoices([voice]).format([voice], 400);
      voice.draw(context, stave);
    } catch (error) {
      console.error('Error rendering notes:', error);
    }
  }, [notes]);

  return (
    <div>
      <div ref={containerRef}></div>
    </div>
  );
};

export default VexFlowScore;
