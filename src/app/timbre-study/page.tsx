'use client';

import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Sphere } from '@/components/three/sphere';

export default function TimbreStudy() {
  const [isPlaying, setIsPlaying] = useState(false);
  const oscillatorsRef = useRef<Tone.Oscillator[]>([]);
  const [volumes, setVolumes] = useState<number[]>([]);
  const masterGainRef = useRef<Tone.Gain | null>(null);
  const NUM_BINS = 32;
  const MIN_VOLUME = -100;

  const createOscillators = () => {
    const oscillators: Tone.Oscillator[] = [];
    const minFreq = 500;
    const maxFreq = 4000;

    const interval = (maxFreq - minFreq) / NUM_BINS;

    const initialVolumes = new Array(NUM_BINS).fill(MIN_VOLUME);
    setVolumes(initialVolumes);

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

  const handleVolumeChange = (sliderIndex: number, value: number) => {
    const newVolumes = [...volumes];
    newVolumes[sliderIndex] = value;
    oscillatorsRef.current[sliderIndex].volume.rampTo(value);
    setVolumes(newVolumes);
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      Tone.getTransport().stop();
      oscillatorsRef.current.forEach(osc => osc.stop());
    } else {
      await Tone.start();
      Tone.getTransport().start();
      oscillatorsRef.current.forEach(osc => osc.start("0"));
      console.log('Starting oscillators');
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">3D Synthesizer</h1>
        
        <div className="relative w-full aspect-square">
          <Canvas className="absolute inset-0">
            <OrbitControls enableZoom={false}/>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Sphere radius={15} widthSegments={NUM_BINS} heightSegments={NUM_BINS} />
            <PerspectiveCamera makeDefault position={[0, 0, 50]} />
          </Canvas>
        </div>

        <div className="mb-8">
          <button
            onClick={togglePlayback}
            className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
          >
            {isPlaying ? 'Stop' : 'Play'}
          </button>
        </div>

        <div className="grid grid-cols-8 gap-4">
          {volumes.map((volume, index) => (
            <div key={index} className="flex flex-col items-center">
              <input
                type="range"
                min={MIN_VOLUME}
                max="0"
                value={volume}
                onChange={(e) => handleVolumeChange(index, Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm mt-1">{volume}dB</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
