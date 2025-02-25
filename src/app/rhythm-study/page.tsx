"use client"
import { useEffect, useRef, useState } from "react";
import loaderStyles from "../../css/loader.module.css";
import * as Tone from "tone";
import { useGlobalDOMEvent } from "@/hooks/dom-event";
import { PitchDetector } from "pitchy";

export default function RhythmStudy() {
    const ANALYSER_SIZE = 4096;
    const [isRecording, setIsRecording] = useState(false);
    const micRef = useRef<Tone.UserMedia | null>(null);
    const analyserRef = useRef<Tone.Analyser | null>(null);
    const pitchHistoryRef = useRef<number[]>([]);
    const rafRef = useRef<number>(null);
    Tone.start();

    useEffect(() => {
        micRef.current = new Tone.UserMedia();
        analyserRef.current =  new Tone.Analyser("waveform", ANALYSER_SIZE);
        micRef.current.connect(analyserRef.current);

        return () => {
          if (micRef.current) {
            micRef.current.close();
            micRef.current = null;
          }

          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          analyserRef.current = null;
          pitchHistoryRef.current = [];
        };
    }, []);

    const isSpaceKey = (event: { keyCode: number; }) => {
        return event.keyCode == 32;
    };
    
    const detectPitch = () => {
        if (!analyserRef.current || !micRef.current || micRef.current.state == "stopped") return;

        const values = analyserRef.current.getValue() as Float32Array;

        const pitchDetector = PitchDetector.forFloat32Array(ANALYSER_SIZE);
        pitchDetector.minVolumeDecibels = -20;

        const [pitch, clarity] = pitchDetector.findPitch(values, Tone.getContext().sampleRate);
        if (clarity > 0.85 && pitch > 60 && pitch < 300) {
            pitchHistoryRef.current.push(pitch);
            console.log(`
                Pitch: ${pitch.toFixed(1)} Hz
                Clarity: ${(clarity * 100).toFixed(0)}%
                `
            );
        }
        rafRef.current = requestAnimationFrame(() => detectPitch());
    }

    useGlobalDOMEvent("keydown", async (e) => {
        e.preventDefault();
        if (!isSpaceKey(e) || isRecording || !micRef.current) return;
        setIsRecording(true);
        await micRef.current.open();
        pitchHistoryRef.current = [];
        detectPitch();
    });

    useGlobalDOMEvent("keyup", async (e) => {
        e.preventDefault();
        if (!isSpaceKey(e) || !isRecording || !micRef.current) return;
        micRef.current.close();
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }
        setIsRecording(false);

        console.log(pitchHistoryRef.current);
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