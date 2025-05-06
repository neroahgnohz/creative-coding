// reference: https://learningmusic.ableton.com/chords/play-with-chords.html
export const CHORDS = {
    "C": ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
    "Cm": ["C4", "D4", "Eb4", "F4", "G4", "Ab4", "Bb4", "C5"],
    "G": ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"],
    "Am": ["A4", "B4", "C5", "D5", "E5", "F#5", "G5", "A5"],
    "F": ["F4", "G4", "A4", "Bb4", "C5", "D5", "E5", "F5"],
}

/**
 * Generates a random color based on a UUID string.
 * @param uuid - The UUID string.
 * @returns A hex color string.
 */
export const getUserColor = (uuid: string): string => {
    // Hash the UUID string to generate a consistent number
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
        hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert the hash to a hex color
    const color = `#${((hash >> 24) & 0xff).toString(16).padStart(2, '0')}${((hash >> 16) & 0xff).toString(16).padStart(2, '0')}${((hash >> 8) & 0xff).toString(16).padStart(2, '0')}`;

    // Ensure the color is valid (fallback to a default color if invalid)
    return /^#[0-9A-F]{6}$/i.test(color) ? color : '#000000';
};