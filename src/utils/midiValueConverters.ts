import { EQ_MAXIMUM_GAIN, EQ_MINIMUM_GAIN, PREAMP_MAXIMUM_GAIN, PREAMP_MINIMUM_GAIN } from '../constants.js'

type EqWidthMidiValuePoint = { width: number; midiValue: number }

const EQ_WIDTH_TO_MIDI_VALUE_MAP: readonly EqWidthMidiValuePoint[] = [
	{ width: 1.5, midiValue: 0x00 },
	{ width: 1.4, midiValue: 0x01 },
	{ width: 1.3, midiValue: 0x02 },
	{ width: 1.2, midiValue: 0x03 },
	{ width: 1.1, midiValue: 0x04 },
	{ width: 1.0, midiValue: 0x05 },
	{ width: 0.95, midiValue: 0x06 },
	{ width: 0.9, midiValue: 0x07 },
	{ width: 0.85, midiValue: 0x08 },
	{ width: 0.8, midiValue: 0x09 },
	{ width: 3 / 4, midiValue: 0x0a },
	{ width: 0.7, midiValue: 0x0b },
	{ width: 2 / 3, midiValue: 0x0c },
	{ width: 0.6, midiValue: 0x0d },
	{ width: 0.55, midiValue: 0x0e },
	{ width: 0.5, midiValue: 0x0f },
	{ width: 0.45, midiValue: 0x10 },
	{ width: 0.4, midiValue: 0x11 },
	{ width: 1 / 3, midiValue: 0x12 },
	{ width: 0.3, midiValue: 0x13 },
	{ width: 1 / 4, midiValue: 0x14 },
	{ width: 0.2, midiValue: 0x15 },
	{ width: 1 / 6, midiValue: 0x16 },
	{ width: 0.13, midiValue: 0x17 },
	{ width: 1 / 9, midiValue: 0x18 },
] as const

export const eqWidthToMidiValue = (width: number): number => {
	let best = EQ_WIDTH_TO_MIDI_VALUE_MAP[0]
	let bestDiff = Math.abs(width - best.width)
	for (let i = 1; i < EQ_WIDTH_TO_MIDI_VALUE_MAP.length; i++) {
		const midiValuePoint = EQ_WIDTH_TO_MIDI_VALUE_MAP[i]
		const diff = Math.abs(width - midiValuePoint.width)
		if (diff < bestDiff) {
			best = midiValuePoint
			bestDiff = diff
		}
	}
	return best.midiValue
}

export const dbGainToMidiValue = (gain: number, minGain: number, maxGain: number): number =>
	Math.round(((gain - minGain) / (maxGain - minGain)) * 0x7f)

export const preampGainToMidiValue = (gain: number): number =>
	dbGainToMidiValue(gain, PREAMP_MINIMUM_GAIN, PREAMP_MAXIMUM_GAIN)

export const eqGainToMidiValue = (gain: number): number => dbGainToMidiValue(gain, EQ_MINIMUM_GAIN, EQ_MAXIMUM_GAIN)

export const midiValueToEqFrequency = (midiValue: number): number => Math.round(20 * Math.pow(1000, midiValue / 0x7f))

export const midiValueToHpfFrequency = (midiValue: number): number => Math.round(20 * Math.pow(100, midiValue / 0x7f))
