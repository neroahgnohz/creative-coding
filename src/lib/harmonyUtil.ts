// reference: https://learningmusic.ableton.com/chords/play-with-chords.html
export const CHORDS = {
    "C": ["C", "D", "E", "F", "G", "A", "B", " "],
    "Cm": ["C", "Bb", "Ab", "G", "F", "Eb", "D", " "],
    "G": ["G", "F#", "E", "D", "C", "B", "A", " "],
    "Am": ["A", "G", "F#", "E", "D", "C", "B", " "],
    "F": ["F", "E", "D", "C", "Bb", "A", "G", " "],
}

export const noteToFrequency = (note: string, octave: number): string => {
    return `${note}${octave}`;
};