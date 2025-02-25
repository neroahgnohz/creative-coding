import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

const PitchDetector = () => {
  const [listening, setListening] = useState(false);
  const [pitch, setPitch] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [pitchHistory, setPitchHistory] = useState([]);
  const [error, setError] = useState(null);
  
  const micRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const pitchyModuleRef = useRef(null);

  // Load Pitchy library on component mount
  useEffect(() => {
    const loadPitchy = async () => {
      try {
        const module = await import('pitchy');
        pitchyModuleRef.current = module;
      } catch (err) {
        console.error("Failed to load Pitchy library:", err);
        setError("Failed to load Pitchy library. Check your internet connection and try again.");
      }
    };
    
    loadPitchy();
    
    return () => {
      cleanup();
    };
  }, []);

  // Clean up resources
  const cleanup = () => {
    if (micRef.current) {
      micRef.current.close();
      micRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // Start/stop pitch detection
  const toggleListen = async () => {
    if (listening) {
      // Stop listening
      cleanup();
      setListening(false);
    } else {
      if (!pitchyModuleRef.current) {
        setError("Pitchy library not loaded yet. Please wait a moment and try again.");
        return;
      }
      
      try {
        // Start audio context
        await Tone.start();
        
        // Create microphone input
        micRef.current = new Tone.UserMedia();
        await micRef.current.open();
        
        // Create analyzer
        analyserRef.current = new Tone.Analyser('waveform', 2048);
        micRef.current.connect(analyserRef.current);
        
        // Start analyzing
        updatePitch();
        setListening(true);
        setError(null);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        setError("Couldn't access microphone. Please check permissions.");
      }
    }
  };

  // Update pitch continuously using Pitchy
  const updatePitch = () => {
    if (!analyserRef.current || !micRef.current || !pitchyModuleRef.current) return;
    
    const buffer = analyserRef.current.getValue();
    
    const [pitch, clarity] = pitchyModuleRef.current.findPitch(
      buffer,
      Tone.context.sampleRate
    );
    
    // Only update if we got a reasonable pitch value with good clarity
    if (clarity > 0.8 && pitch > 50 && pitch < 2000) {
      setPitch(Math.round(pitch));
      setClarity(Math.round(clarity * 100));
      setPitchHistory(prev => [...prev.slice(-50), pitch]);
    }
    
    rafRef.current = requestAnimationFrame(updatePitch);
  };

  // Convert Hz to musical note
  const hzToNote = (hz) => {
    if (hz < 20) return "---";
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const a4 = 440;
    const a4Index = 69; // MIDI note number for A4
    
    const noteNum = 12 * Math.log2(hz / a4) + a4Index;
    const noteIndex = Math.round(noteNum) % 12;
    const octave = Math.floor(Math.round(noteNum) / 12) - 1;
    
    return noteNames[noteIndex] + octave;
  };

  // Detect pitch changes in real-time
  const detectPitchChange = () => {
    if (pitchHistory.length < 5) return { direction: "none", magnitude: 0 };
    
    const recentHistory = pitchHistory.slice(-5);
    const firstPitch = recentHistory[0];
    const lastPitch = recentHistory[recentHistory.length - 1];
    const difference = lastPitch - firstPitch;
    
    // Calculate change direction and magnitude
    let direction = "none";
    if (difference > 10) direction = "up";
    else if (difference < -10) direction = "down";
    
    return {
      direction,
      magnitude: Math.abs(difference)
    };
  };

  // Visualize pitch history as a line graph
  const renderPitchGraph = () => {
    if (pitchHistory.length < 2) return null;
    
    const max = 800; // Max pitch to display (Hz)
    const height = 100;
    const width = 300;

    const points = pitchHistory.map((p, i) => {
      const x = (i / (pitchHistory.length - 1)) * width;
      const y = height - (Math.min(p, max) / max) * height;
      return `${x},${y}`;
    }).join(' ');

    const pitchChange = detectPitchChange();
    
    return (
      <div className="mt-4">
        <div className="flex justify-between mb-1">
          <p className="text-sm text-gray-600">Pitch History (Hz)</p>
          {pitchChange.direction !== "none" && (
            <span className={`text-sm font-medium ${pitchChange.direction === "up" ? "text-green-600" : "text-red-600"}`}>
              {pitchChange.direction === "up" ? "↑ Rising" : "↓ Falling"} 
              {pitchChange.magnitude > 20 ? " (Strong)" : ""}
            </span>
          )}
        </div>
        <svg width={width} height={height} className="border border-gray-300 bg-gray-50 rounded">
          <polyline 
            points={points} 
            stroke="blue" 
            strokeWidth="2" 
            fill="none" 
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Speech Pitch Detector</h1>
      
      {error && <div className="text-red-500 mb-4">{error}</div>}
      
      <button 
        onClick={toggleListen}
        className={`px-6 py-3 text-white font-medium rounded-md ${listening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
      >
        {listening ? 'Stop Listening' : 'Start Listening'}
      </button>
      
      <div className="mt-8 w-full">
        <div className="flex justify-between mb-2">
          <span className="text-gray-700">Current Pitch:</span>
          <span className="font-mono">{pitch > 0 ? `${pitch} Hz` : "---"}</span>
        </div>
        
        <div className="flex justify-between mb-2">
          <span className="text-gray-700">Musical Note:</span>
          <span className="font-mono">{pitch > 0 ? hzToNote(pitch) : "---"}</span>
        </div>
        
        <div className="flex justify-between mb-2">
          <span className="text-gray-700">Clarity:</span>
          <span className="font-mono">{clarity > 0 ? `${clarity}%` : "---"}</span>
        </div>
        
        {/* Pitch meter visualization */}
        <div className="h-16 bg-gray-100 border border-gray-300 rounded-md overflow-hidden mt-4">
          <div 
            className="h-full bg-gradient-to-r from-blue-300 to-blue-500 transition-all duration-100"
            style={{ width: `${Math.min((pitch / 1000) * 100, 100)}%` }}
          ></div>
        </div>
        
        {renderPitchGraph()}
      </div>
      
      <div className="mt-8 text-sm text-gray-600">
        <p>Instructions:</p>
        <ul className="list-disc pl-5 mt-2">
          <li>Click "Start Listening" and allow microphone access</li>
          <li>Speak or sing into your microphone</li>
          <li>The app will display your current pitch, note, and clarity</li>
          <li>The graph shows pitch changes over time</li>
          <li>Rising/falling indicators show pitch direction changes</li>
        </ul>
      </div>
    </div>
  );
};

export default PitchDetector;