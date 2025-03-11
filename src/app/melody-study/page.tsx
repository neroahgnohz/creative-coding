"use client"

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { Fourier } from "@/lib/fft";
import * as Tone from "tone";

type CharImage = {
    id: number,
    char: string,
    src: string,
    fftCanvas: string,
    fftData: ImageData | undefined,
    overlayCanvas: string,
};

const CHINESE_PENTATONIC_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00];

const MelodyStudy = () => {
    const CANVAS_WIDTH = 512;
    const CANVAS_HEIGHT = 512;
    const FONT_SIZE = 512;
    const FONT_FAMILY = "Noto Sans";

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [sentence, setSentence] = useState("");
    const [images, setImages] = useState<CharImage[]>([]);
    const [toneSequence, setToneSequence] = useState<Tone.Sequence<string> | null>(null);
    const synth = new Tone.Synth().toDestination();

    const convertToMelody = () => {
        if (sentence.length === 0) {
            return;
        }

        const charImages = convertToImages();
        setImages(charImages);

        const toneSequence = convertToSequence(charImages, synth);
        setToneSequence(toneSequence);
    };

    const convertToImages = () => {
        const chars = sentence.split("");
        const charImages = chars.map((char, index) => {    
            const canvas = convertToCharImage(char);
            const ctx = canvas.getContext("2d");
            const fftCanvas = generateImageFromFFT(canvas);
            const overlayCanvas = overlayCharOverFFTImage(fftCanvas, char);

            return {
              id: index,
              char,
              src: canvas.toDataURL("image/png"),
              fftCanvas: fftCanvas.toDataURL("image/png"),
              fftData: fftCanvas.getContext("2d")?.getImageData(0, 0, fftCanvas.width, fftCanvas.height),
              overlayCanvas: overlayCanvas.toDataURL("image/png"),
            };
        });
        return charImages
    }

    const convertToCharImage = (char: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        const fontSize = FONT_SIZE;
        const fontFamily = FONT_FAMILY;
        const ctx = canvas.getContext("2d");
    
        if (ctx) {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "black";
            ctx.font = `${fontSize}px ${fontFamily}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(char, canvas.width / 2, canvas.height / 2);
        }
        return canvas;
    }

    const generateImageFromFFT = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return canvas;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = new Float32Array(imageData.data.length / 4);
        for (let i = 0; i < data.length; i++) {
            data[i] = imageData.data[i * 4] / 255;
        }
        
        const complexData = [];
        for (let i = 0; i < data.length; i++) {
            complexData.push(new Fourier.Complex(data[i], 0));
        }

        const fftResult = new Array(complexData.length);
        Fourier.transform(Array.from(data), fftResult);

        const shiftedFFT = Fourier.shift(fftResult, [canvas.width, canvas.height]);
        let maxMagnitude = -Infinity;
        let minMagnitude = Infinity;
        for (const c of shiftedFFT) {
            const magnitude = c.magnitude();
            if (magnitude > maxMagnitude) maxMagnitude = magnitude;
            if (magnitude < minMagnitude) minMagnitude = magnitude;
        }

        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = canvas.width;
        outputCanvas.height = canvas.height;
        const outputCtx = outputCanvas.getContext("2d");
        if (outputCtx) {
            const outputImageData = outputCtx.createImageData(canvas.width, canvas.height);
            for (let i = 0; i < shiftedFFT.length; i++) {
                const magnitude = shiftedFFT[i].magnitude();
                const normalizedValue = ((Math.log1p(magnitude) - Math.log1p(minMagnitude)) / (Math.log1p(maxMagnitude) - Math.log1p(minMagnitude))) * 255;
                outputImageData.data[i * 4] = normalizedValue;
                outputImageData.data[i * 4 + 1] = normalizedValue;
                outputImageData.data[i * 4 + 2] = normalizedValue;
                outputImageData.data[i * 4 + 3] = 255;
            }
            outputCtx.putImageData(outputImageData, 0, 0);
        }

        return outputCanvas;
    }

    const overlayCharOverFFTImage = (canvas: HTMLCanvasElement, char: string) => {
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = canvas.width;
        outputCanvas.height = canvas.height;
        const outputCtx = outputCanvas.getContext("2d");
        if (outputCtx) {
            outputCtx.drawImage(canvas, 0, 0);
            outputCtx.fillStyle = "white";
            outputCtx.font = `${FONT_SIZE / 4}px ${FONT_FAMILY}`;
            outputCtx.textAlign = "center";
            outputCtx.textBaseline = "middle";
            outputCtx.fillText(char, canvas.width / 2, canvas.height / 2);
        }
        return outputCanvas;
    }

    const convertToSequence = (charImages: any[], synth: any) => {
        const notes = charImages.flatMap((image, index) => {
            const imageData = image.fftData;
            if (imageData) {
                const data = new Float32Array(imageData.data.length / 4);
                for (let i = 0; i < data.length; i++) {
                    data[i] = imageData.data[i * 4] / 255;
                }

                const frequencies = [];
                const rows = imageData.height;
                const cols = imageData.width;

                const step = Math.max(1, Math.floor(rows / 10));
                for (let row = 0; row < rows; row += step) {
                    for (let col = 0; col < cols; col += step) {
                        const value = data[row * cols + col];
                        if (value > 0.1) {
                            const scaledValue = value * (CHINESE_PENTATONIC_SCALE.length - 1);
                            const noteIndex = Math.round(scaledValue);
                            const frequency = CHINESE_PENTATONIC_SCALE[noteIndex];
                            frequencies.push(Tone.Frequency(frequency).toNote());
                        }
                    }
                }

                return frequencies;
            }
            return [];
        });

        console.log(notes);
        const sequence = new Tone.Sequence((time, note) => {
            synth.triggerAttackRelease(note, 0.1, time);
        }, notes);

        console.log(synth);
        return sequence;
    }

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [sentence]);

    useEffect(() => {
        if (toneSequence) {
            console.log("Playing melody");
            toneSequence.start(0);
            Tone.getTransport().start();
        }

        return () => {
            if (toneSequence) {
                toneSequence.stop();
                Tone.getTransport().stop();
            }
        };
    }, [toneSequence]);

    return (
        <div>
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
                    <Button className="place-content-end" onClick={convertToMelody}>Generate Melody</Button>
                </div>
                <div className="col-span-8 col-start-3">
                    <div className="grid grid-cols-8 gap-2">
                        {images.map((image) => (
                            <Card key={image.id} className="aspect-square">
                                <CardContent className="p-2">
                                    <img src={image.overlayCanvas} alt={`${image.char} FFT`} className="w-full h-full object-contain" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default dynamic(() => Promise.resolve(MelodyStudy), { ssr: false });