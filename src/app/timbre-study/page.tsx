'use client';

import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Sphere, SphereRef } from "@/components/three/sphere";

export default function TimbreStudy() {
  const [isPlaying, setIsPlaying] = useState(false);
  const oscillatorsRef = useRef<Tone.Oscillator[]>([]);
  const masterGainRef = useRef<Tone.Gain | null>(null);
  const NUM_BINS = 32;
  const MIN_VOLUME = -100;
  const sphereRef = useRef<SphereRef>(null);
  const [duration, setDuration] = useState(0.001);
  const [currentColumn, setCurrentColumn] = useState(0);

  const createOscillators = () => {
    const oscillators: Tone.Oscillator[] = [];
    const minFreq = 500;
    const maxFreq = 4000;

    const interval = (maxFreq - minFreq) / NUM_BINS;

    const masterGain = new Tone.Gain(-10).toDestination();
    masterGainRef.current = masterGain;

    for (let i = 1; i <= NUM_BINS; i++) {
      const oscillator = new Tone.Oscillator({
        frequency: i * interval,
        type: 'sine',
        volume: MIN_VOLUME,
      }).connect(masterGain);

      oscillators.push(oscillator);
    }

    oscillatorsRef.current = oscillators;
  };

  useEffect(() => {
    createOscillators();

    return () => {
      oscillatorsRef.current.forEach(osc => osc.dispose());
      if (masterGainRef.current) {
        masterGainRef.current.dispose();
      }
    };
  }, []);

  const togglePlayback = async () => {
    if (isPlaying) {
      Tone.getTransport().stop();
      oscillatorsRef.current.forEach(osc => osc.stop());
      setIsPlaying(false);
    } else {
      await Tone.start();
      Tone.getTransport().start();
      setCurrentColumn(0);
      oscillatorsRef.current.forEach(osc => osc.start());
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (!isPlaying || !sphereRef.current) return;

    const updateAmplitudes = () => {
      const amplitudes = sphereRef.current?.getVertexAmplitudes(currentColumn) || [];
      
      oscillatorsRef.current.forEach((osc, i) => {
        const amplitude = amplitudes[i] || 0;
        const volume = amplitude == 15 ? -100 : -50 + amplitude * 2;
        console.log(volume);
        osc.volume.rampTo(volume);
      });

      setTimeout(() => {
        if (isPlaying) {
          setCurrentColumn((prev) => (prev + 1) % (NUM_BINS * 2));
        }
      }, duration * 1000);
    };

    // Update amplitudes every frame
    const interval = setInterval(updateAmplitudes, 1000 / 60);
    return () => clearInterval(interval);
  }, [isPlaying, oscillatorsRef.current, duration, currentColumn]);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="relative w-full aspect-square">
          <Canvas className="absolute inset-0">
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Sphere 
              ref={sphereRef} 
              radius={15} 
              widthSegments={NUM_BINS * 2} 
              heightSegments={NUM_BINS} 
              isPlaying={isPlaying}
              currentColumn={currentColumn}
            />
            <PerspectiveCamera makeDefault position={[0, 0, 50]} />
          </Canvas>
        </div>

        <div className="mb-8 flex items-center gap-4 justify-center">
          <div className="flex items-center gap-2">
            <label htmlFor="duration" className="text-sm">Duration (s):</label>
            <input
              id="duration"
              type="range"
              min="0.001"
              max="1"
              step="0.001"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-32 h-2 bg-gray-700 accent-white rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm">{duration.toFixed(3)}s</span>
          </div>

          <button
            onClick={togglePlayback}
            className="px-4 py-2 bg-white text-black rounded hover:bg-blue-600 transition-colors"
          >
            {isPlaying ? 'Stop' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
