"use client"
import { useState } from "react";
import loaderStyles from "../../css/loader.module.css";
import * as Tone from "tone";
import { useGlobalDOMEvent } from "@/hooks/dom-event";
import { PitchDetector } from "pitchy";

export default function RhythmStudy() {
    const [isRecording, setIsRecording] = useState(false);
    let isDetecting = false;

    Tone.start();
    const analyserResolution = 4096;
    const analyser =  new Tone.Analyser("waveform", analyserResolution);
    const mic = new Tone.UserMedia();
    const pitchDetector = PitchDetector.forFloat32Array(analyser.size);
    pitchDetector.minVolumeDecibels = -20;

    const isSpaceKey = (event: { keyCode: number; }) => {
        return event.keyCode == 32;
    };

    let pitchHistory: number[] = [];
    const HISTORY_LENGTH = 20;

    const startRecording = () => {
        setIsRecording(true);
        isDetecting = true;
        pitchHistory = []

        mic.open().then(() => {
            console.log('Microphone ready');
            mic.connect(analyser);
            detectPitch();
        }).catch(e => {
            console.log('Error opening microphone:', e);
        });
    }

    const updatePitchHistory = (pitch: number) => {
        pitchHistory.push(pitch);
        if (pitchHistory.length > HISTORY_LENGTH) {
            pitchHistory.shift(); // Keep fixed window size
        }
    }

    const calculateSlope = (pitchHistory: number[]) => {
        const n = pitchHistory.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += pitchHistory[i];
            sumXY += i * pitchHistory[i];
            sumXX += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope;
    }

    const hasDip = (pitchHistory: number[]) => {
        const firstThird = pitchHistory.slice(0, Math.floor(pitchHistory.length / 3));
        const lastThird = pitchHistory.slice(-Math.floor(pitchHistory.length / 3));
        
        const slopeStart = calculateSlope(firstThird);
        const slopeEnd = calculateSlope(lastThird);
      
        return slopeStart < -0.2 && slopeEnd > 0.2;
      }

    const detectTone = (pitchHistory: number[]) => {
        if (pitchHistory.length != HISTORY_LENGTH) return undefined;

        const slope = calculateSlope(pitchHistory);
        const avgPitch = pitchHistory.reduce((a, b) => a + b, 0) / pitchHistory.length;

        console.log("slope " + slope);
        console.log("avgPitch " + avgPitch);
        if (Math.abs(slope) <= 0.2) return 1;

        if (slope > 0.2) return 2;
      
        if (slope < -0.2) return 4;
      
        if (hasDip(pitchHistory)) return 3;
      
        return "Unknown";
    }

    const detectPitch = () => {
        if (!isDetecting) return;

        const values = analyser.getValue() as Float32Array;
        const [pitch, clarity] = pitchDetector.findPitch(values, Tone.getContext().sampleRate);
        if (clarity > 0.85 && pitch > 60 && pitch < 300) {
            updatePitchHistory(pitch);
            const tone = detectTone(pitchHistory);
            console.log(`
                Pitch: ${pitch.toFixed(1)} Hz
                Clarity: ${(clarity * 100).toFixed(0)}%
                Tone: ${tone}
                `);
        }
        requestAnimationFrame(() => detectPitch());
    }

    const stopRecording = () => {
        console.log("mic closed");
        isDetecting = false;
        mic.close();
        setIsRecording(false);
    }

    useGlobalDOMEvent("keydown", (e) => {
        if (!isSpaceKey(e) || isRecording) return;
        startRecording();
    });

    useGlobalDOMEvent("keyup", (e) => {
        if (!isSpaceKey(e) || !isRecording) return;
        stopRecording();
    });

    return (
        <div className="grid place-items-center h-screen">
            {!isRecording && 
                <p className="leading-7 [&:not(:first-child)]:mt-6 text-xl">
                    Hold <b>SPACE</b> to record
                </p>
            }
            {isRecording && <div className={loaderStyles.ripple}><div></div><div></div></div>}
        </div>
    );
}