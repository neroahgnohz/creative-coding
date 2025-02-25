"use client"
import { useEffect, useRef, useState } from "react";
import loaderStyles from "../../css/loader.module.css";
import * as Tone from "tone";
import { useGlobalDOMEvent } from "@/hooks/dom-event";
import { PitchDetector } from "pitchy";
import dynamic from 'next/dynamic'


type PitchTimestamp = {
    pitch: number;
    timestamp: number;
};

type SyllableBoundary = {
    pitches: PitchTimestamp[];
};

type Syllable = {
    duration: number;
    tone: number;
}

type playerMap = {
    [key: number]: string;
}

const RhythmStudy = () => {
    const ANALYSER_SIZE = 4096;
    const BPM = 80;
    const [isRecording, setIsRecording] = useState(false);
    const [bgColor, setBgColor] = useState("white");
    const micRef = useRef<Tone.UserMedia | null>(null);
    const analyserRef = useRef<Tone.Analyser | null>(null);
    const pitchHistoryRef = useRef<PitchTimestamp[]>([]);
    const rafRef = useRef<number>(null);
    Tone.start();
    const tonePlayers = new Tone.Players({
        "kick": "/creative-coding/audio/kick.mp3", 
        "snare": "/creative-coding/audio/snare.mp3",
        "hh": "/creative-coding/audio/hh.mp3",
        "hho": "/creative-coding/audio/hho.mp3"
    });
    const tonePlayersMap: playerMap = {
        1: "snare",
        2: "hho",
        3: "hh",
        4: "kick"
    }
    tonePlayers.toDestination();
    Tone.getTransport().bpm.value = BPM;

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

    const scheduleToneRhythm = (syllables: Syllable[]) => {
        Tone.getTransport().loop = true;
        Tone.getTransport().loopStart = "0m";

        let currentTime = 0;
        let startTime = "";
        syllables.forEach((syllable) => {
            startTime = Tone.Time(currentTime).toBarsBeatsSixteenths();
            console.log("start Time " + startTime);

            Tone.getTransport().schedule((time) => {
                tonePlayers.player(tonePlayersMap[syllable.tone]).start(time);
                Tone.getDraw().schedule(() => {
                    let bgColor = "white";
                    switch (syllable.tone) {
                        case 1:
                            bgColor = "#F7F7F2";
                            break;
                        case 2:
                            bgColor = "#B1DDF1";
                            break; 
                        case 3:
                            bgColor = "#C8E9A0";
                            break;
                        case 4:
                            bgColor = "#D7DCDF";
                            break;
                        default:
                            break;
                    }
                    setBgColor(bgColor);
                }, time);
            }, startTime);

            const quantizedDuration = Tone.Time(syllable.duration / 1000).quantize("64n");
            const newTime = currentTime + quantizedDuration;
            currentTime = newTime;
        });
        
        // add some space after scheduling
        Tone.getTransport().loopEnd = (startTime.split(":")[0] + 0.75) + "m"; 
    };

    const detectPitch = () => {
        if (!analyserRef.current || !micRef.current || micRef.current.state == "stopped") return;

        const values = analyserRef.current.getValue() as Float32Array;

        const pitchDetector = PitchDetector.forFloat32Array(ANALYSER_SIZE);
        // To filter out some noise
        pitchDetector.minVolumeDecibels = -25;

        const [pitch, clarity] = pitchDetector.findPitch(values, Tone.getContext().sampleRate);
        if (clarity > 0.70 && pitch < 300) {
            pitchHistoryRef.current.push({
                pitch,
                timestamp: Date.now()
            });
            // For debugging
            // console.log(`
            //     Pitch: ${pitch.toFixed(1)} Hz
            //     Clarity: ${(clarity * 100).toFixed(0)}%
            //     Time: ${Date.now()}
            //     `
            // );
        }
        rafRef.current = requestAnimationFrame(() => detectPitch());
    }

    const findSyllables = (syllableBoundaries: SyllableBoundary[]) => {
        return syllableBoundaries.map((syllableBoundary) => {
            const firstPitch = syllableBoundary.pitches[0];
            const lastPitch = syllableBoundary.pitches[syllableBoundary.pitches.length - 1];
            return {
                duration: lastPitch.timestamp - firstPitch.timestamp,
                tone: detectTone(syllableBoundary.pitches)
            }
        })
    }

    const detectTone = (pitchHistory: PitchTimestamp[]) => {
        const slope = calculateSlope(pitchHistory);

        if (Math.abs(slope) < 0.1) return 1;
        if (hasDip(pitchHistory)) return 3;
        if (slope > 0) {
            return 2;
        }
        return 4;
    }

    const calculateSlope = (pitchHistory: PitchTimestamp[]) => {
        if (pitchHistory.length < 2) return 0;
        
        const n = pitchHistory.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += pitchHistory[i].pitch;
            sumXY += i * pitchHistory[i].pitch;
            sumXX += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope;
    };

    const hasDip = (pitchHistory: PitchTimestamp[]) => {
        const firstThird = pitchHistory.slice(0, Math.floor(pitchHistory.length / 3));
        const lastThird = pitchHistory.slice(-Math.floor(pitchHistory.length / 3));
        
        const slopeStart = calculateSlope(firstThird);
        const slopeEnd = calculateSlope(lastThird);
      
        return slopeStart < 0 && slopeEnd > 0;
    }

    const findSyllableBoundaries = () => {
        const syllableBoundaries: SyllableBoundary[] = [];
        const pitchHistory = pitchHistoryRef.current;
        const pitchShiftThreshold = 7;
        for (let i = 0; i < pitchHistory.length; i++) {
            const boundariesLen = syllableBoundaries.length;
            if (pitchHistory[i].pitch < 25) {
                if (boundariesLen == 0 || syllableBoundaries[boundariesLen - 1].pitches.length != 0) {
                    syllableBoundaries.push({
                        pitches: []
                    })
                }
            } else {
                const lastBoundary = syllableBoundaries[boundariesLen - 1];
                const numPitches = lastBoundary.pitches.length;
                if (numPitches > 0) {
                    const lastPitch = lastBoundary.pitches[numPitches - 1];
                    if (Math.abs(lastPitch.pitch - pitchHistory[i].pitch) >= pitchShiftThreshold) {
                        syllableBoundaries.push({
                            pitches: []
                        })
                    }
                }
                syllableBoundaries[boundariesLen - 1].pitches.push(pitchHistory[i]);
            }
        }
        return syllableBoundaries;
    }

    const mergeSyllableBoundariesIfClose = (syllableBoundaries: SyllableBoundary[]) => {
        if (syllableBoundaries.length < 2) return  syllableBoundaries;

        const mergedSyllableBoundaries: SyllableBoundary[] = [];
        mergedSyllableBoundaries.push(syllableBoundaries[0]);

        for (let i = 1; i < syllableBoundaries.length; i++) {
            const syllableBoundary = syllableBoundaries[i];
            if (syllableBoundary.pitches.length == 0) continue;

            const lastMergedSyllableBoundary = mergedSyllableBoundaries[mergedSyllableBoundaries.length - 1];
            const lastPitch = lastMergedSyllableBoundary.pitches[lastMergedSyllableBoundary.pitches.length - 1];
            const nextFirstPitch = syllableBoundary.pitches[0];
            if (Math.abs(nextFirstPitch.pitch - lastPitch.pitch) <= 5 && nextFirstPitch.timestamp - lastPitch.timestamp <= 100) {
                lastMergedSyllableBoundary.pitches.push(... syllableBoundary.pitches);
            } else {
                mergedSyllableBoundaries.push(syllableBoundary);
            }
        }
        return mergedSyllableBoundaries;
    }

    const processPitchHistory = () => {
        const syllableBoundaries = findSyllableBoundaries();
        console.log(syllableBoundaries);
        const mergedSyllableBoundaries = mergeSyllableBoundariesIfClose(syllableBoundaries);
        console.log(mergedSyllableBoundaries);

        const syllables = findSyllables(mergedSyllableBoundaries);
        return syllables;
    }

    useGlobalDOMEvent("keydown", async (e) => {
        e.preventDefault();
        if (!isSpaceKey(e) || isRecording || !micRef.current) return;
        Tone.getTransport().stop();
        Tone.getTransport().cancel();
        setIsRecording(true);
        await micRef.current.open();
        pitchHistoryRef.current = [];
        pitchHistoryRef.current.push({
            pitch: 0,
            timestamp: Date.now()
        });
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

        const syllables = processPitchHistory();
        scheduleToneRhythm(syllables);
        Tone.getTransport().start();

    });

    return (
        <div className="grid place-items-center h-screen" style={{ backgroundColor: bgColor}}>
            {!isRecording && 
                <p className="leading-7 [&:not(:first-child)]:mt-6 text-xl">
                    Hold <b>SPACE</b> to record
                </p>
            }
            {isRecording && <div className={loaderStyles.ripple}><div></div><div></div></div>}
        </div>
    );
}

export default dynamic(() => Promise.resolve(RhythmStudy), { ssr: false });
