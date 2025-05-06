// reference: https://learningmusic.ableton.com/chords/play-with-chords.html
export const CHORDS = {
    "C": ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
    "Cm": ["C4", "D4", "Eb4", "F4", "G4", "Ab4", "Bb4", "C5"],
    "G": ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"],
    "Am": ["A4", "B4", "C5", "D5", "E5", "F#5", "G5", "A5"],
    "F": ["F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5"],
}

export const getUserColor = (uuid: string): string => {
    // Hash the UUID string to generate a consistent number
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
        hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert the hash to RGB values
    const r = (hash >> 16) & 0xff;
    const g = (hash >> 8) & 0xff;
    const b = hash & 0xff;

    // Blend the color with white to make it lighter
    const blendWithWhite = (color: number) => Math.min(255, Math.floor(color + (255 - color) * 0.5));

    const lighterR = blendWithWhite(r);
    const lighterG = blendWithWhite(g);
    const lighterB = blendWithWhite(b);

    // Convert the lighter RGB values to a hex color
    return `#${lighterR.toString(16).padStart(2, '0')}${lighterG.toString(16).padStart(2, '0')}${lighterB.toString(16).padStart(2, '0')}`;
};