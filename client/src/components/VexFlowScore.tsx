import React, { useEffect, useRef } from 'react';
import Flow from 'vexflow';
import * as Tone from 'tone';

const VexFlowScore: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Define the notes: label (for Tone.js) + key (for VexFlow)
  const noteData = ['C4', 'D4', 'E4', 'F4'];

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

    // Convert to VexFlow StaveNotes
    const vexNotes = noteData.map((note) => {
      const key = note.toLowerCase().replace('4', '/4'); // e.g., 'C4' → 'c/4'
      return new VF.StaveNote({ keys: [key], duration: 'q' });
    });

    const voice = new VF.Voice({ numBeats: 4, beatValue: 4 });
    voice.addTickables(vexNotes);
    new VF.Formatter().joinVoices([voice]).format([voice], 400);
    voice.draw(context, stave);
  }, []);

  const handlePlay = async () => {
    await Tone.start();
    const synth = new Tone.Synth().toDestination();

    noteData.forEach((note, i) => {
      synth.triggerAttackRelease(note, '8n', Tone.now() + i * 0.5);
    });
  };

  return (
    <div>
      <h2>🎵 VexFlow Score + Playback</h2>
      <div ref={containerRef}></div>
      <button onClick={handlePlay}>▶️ Play</button>
    </div>
  );
};

export default VexFlowScore;
