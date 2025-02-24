"use client"
import { useState } from "react";
import loaderStyles from "../../css/loader.module.css";
import * as Tone from "tone";
import { useGlobalDOMEvent } from "@/hooks/dom-event";

export default function RhythmStudy() {
    const [isRecording, setIsRecording] = useState(false);

    Tone.start();
    const recorder = new Tone.Recorder();
    const mic = new Tone.UserMedia();
    mic.open().then(() => {
        mic.connect(recorder);
        console.log('Microphone ready');
    }).catch(e => {
        console.log('Error opening microphone:', e);
    });

    let player;

    const isSpaceKey = (event: { keyCode: number; }) => {
        return event.keyCode == 32;
    };

    const hasRecorderStarted = () => {
        return recorder.state == "started";
    }

    const startRecording = () => {
        if (hasRecorderStarted()) return;
        recorder.start();
    }

    const stopRecording = () => {
        if (!hasRecorderStarted()) return;
        recorder.stop().then( (recording) => {
                const url = URL.createObjectURL(recording);

                if (player) {
                    player.stop();
                    player.dispose();
                }
                
                // Create a new player with the recording
                player = new Tone.Player({
                    url: url,
                    loop: false,
                    autostart: true
                }).toDestination();
            }
        )
    }

    useGlobalDOMEvent("keydown", (e) => {
        if (!isSpaceKey(e)) return;
        setIsRecording(true);
        startRecording();
    });

    useGlobalDOMEvent("keyup", (e) => {
        if (!isSpaceKey(e)) return;
        setIsRecording(false);
        stopRecording();
    });

    return (
        <div className="grid place-items-center h-screen">
            {isRecording ?
            <div className={loaderStyles.ripple}><div></div><div></div></div> :
            <p className="leading-7 [&:not(:first-child)]:mt-6 text-xl">
                Press <b>SPACE</b> to record
            </p>}
        </div>
    );
}