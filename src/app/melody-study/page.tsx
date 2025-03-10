"use client"

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const MelodyStudy = () => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [sentence, setSentence] = useState("");

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
        textarea.style.height = "auto"; // Reset height to recalculate
        textarea.style.height = `${textarea.scrollHeight}px`; // Expand to fit content
        }
    }, [sentence]); // Runs whenever `value` changes

    return (
        <div className="grid grid-cols-12 p-5 gap-2">
            <div className="col-span-8 col-start-3">
                <Textarea
                    ref={textareaRef}
                    value={sentence}
                    onChange={(e) => setSentence(e.target.value)} 
                    placeholder="Type your message here." 
                    className="resize-none overflow-hidden focus:none active:none"
                />
                
            </div>
            <div className="col-span-8 col-start-3 place-self-end">
            `<Button className="place-content-end">Generate Melody</Button>
            </div>
        </div>
    );
}

export default dynamic(() => Promise.resolve(MelodyStudy), { ssr: false });