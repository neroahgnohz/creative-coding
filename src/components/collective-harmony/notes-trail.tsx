import React, { useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const Sketch = dynamic(() => import("react-p5"), { ssr: false });

interface NotesTrailProps {
  notes: string[];
  windowWidth: number;
  windowHeight: number;
  activeNodes: { [key: string]: string };
}

const NotesTrail: React.FC<NotesTrailProps> = ({
  notes,
  windowWidth,
  windowHeight,
  activeNodes,
}) => {
    const trailsRef = useRef<Record<string, { x: number; y: number }[]>>({});

    const activeRef = useRef(activeNodes);
    useEffect(() => {
        activeRef.current = activeNodes;
    }, [activeNodes]);

    const setup = (p5: any, canvasParentRef: Element) => {
        p5.createCanvas(windowWidth, windowHeight).parent(canvasParentRef);
        p5.frameRate(30);
    };

    const getNodeIndex = (note: string) => {
        console.log("note", note);
        console.log("notes", notes);
        return notes.findIndex((n) => n === note);
    };

    const draw = (p5: any) => {
        p5.background(3, 7, 18);

        const rowHeight = windowHeight / notes.length;

        p5.stroke(255, 150);
        for (let i = 1; i < notes.length; i++) {
            p5.line(0, i * rowHeight, windowWidth, i * rowHeight);
        }

        const trails = trailsRef.current;
        for (const [color, node] of Object.entries(activeRef.current)) {
            if (node == "" ) continue;
            if (!trails[color]) trails[color] = [];

            const nodeIndex = getNodeIndex(node);
            trails[color].push({
                x: 0,
                y: nodeIndex * rowHeight,
            });
        }

        for (const [color, trail] of Object.entries(trails)) {
            p5.fill(color);
            p5.noStroke();
            for (let point of trail) {
                p5.rect(point.x, point.y, rowHeight, rowHeight);
                point.x += 5;
            }
            trails[color] = trail.filter(pt => pt.x < windowWidth);
        }
    };

    return <Sketch setup={setup} draw={draw} />;
};

export default React.memo(NotesTrail);