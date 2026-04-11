export const stringToMidiBytes = (value: string): number[] => Array.from(value).map((c) => c.charCodeAt(0) & 0x7f)
