import React, { useState, useEffect } from "react";
import * as Tone from 'tone';

interface FlashingStripProps {
    bpm: number;
}

const FlashingStrip: React.FC<FlashingStripProps> = ({ bpm }) => {
    const [isPulse, setIsPulse] = useState(false);

    useEffect(() => {
        const id = Tone.getTransport().scheduleRepeat(() => {
            setIsPulse(true);
            setTimeout(() => setIsPulse(false), 100);
        }, "4n");

        return () => {
            Tone.getTransport().clear(id);
            Tone.getTransport().stop();
        };
    }, [bpm]);

    return (
        <div
            className={
                `absolute left-0 top-0 w-20 h-full transition-transform duration-100 ease-out ` +
                (isPulse ? 'opacity-80' : 'opacity-50')
            }
            style={{
                background: 'linear-gradient(to right, rgba(82, 82, 82, 1) 10%, rgba(82, 82, 82, 0.5) 50%, rgba(82, 82, 82, 0) 100%)',
                zIndex: 10,
            }}
        />
    );
};

export default FlashingStrip;