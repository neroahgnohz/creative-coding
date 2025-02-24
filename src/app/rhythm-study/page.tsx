"use client"
import { useState } from "react";
import loaderStyles from "../../css/loader.module.css";
import * as Tone from "tone";
import { useGlobalDOMEvent } from "@/hooks/dom-event";
import { PitchDetector } from "pitchy";

export default function RhythmStudy() {
    const [isRecording, setIsRecording] = useState(false);

    Tone.start();
    const analyserResolution = 4096;
    const analyser =  new Tone.Analyser("waveform", analyserResolution);
    const mic = new Tone.UserMedia();
    const pitchDetector = PitchDetector.forFloat32Array(analyser.size);

    const isSpaceKey = (event: { keyCode: number; }) => {
        return event.keyCode == 32;
    };

    let detectionInterval: NodeJS.Timeout;
    const startRecording = () => {
        setIsRecording(true);
        mic.open().then(() => {
            console.log('Microphone ready');
            mic.connect(analyser);
            detectionInterval = setInterval(() => {
                detectPitch();
            }, 100);
        }).catch(e => {
            console.log('Error opening microphone:', e);
        });
    }

    const detectPitch = () => {
        const values = analyser.getValue() as Float32Array;
        const [pitch, clarity] = pitchDetector.findPitch(values, Tone.getContext().sampleRate);
        if (clarity > 0.8 && pitch > 80 && pitch < 300) {
            console.log(`
                Pitch: ${pitch.toFixed(1)} Hz
                Clarity: ${(clarity * 100).toFixed(0)}%
                `);
        }
        requestAnimationFrame(() => detectPitch());
    }

    const stopRecording = () => {
        console.log("mic closed");
        clearInterval(detectionInterval);
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