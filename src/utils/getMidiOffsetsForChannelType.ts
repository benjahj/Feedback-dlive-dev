import { CHANNEL_MIDI_CHANNEL_OFFSETS, CHANNEL_MIDI_NOTE_OFFSETS } from '../constants.js'

export const getMidiOffsetsForChannelType = (
	channelType: ChannelType,
): { midiChannelOffset: number; midiNoteOffset: number } => ({
	midiChannelOffset: CHANNEL_MIDI_CHANNEL_OFFSETS[channelType],
	midiNoteOffset: CHANNEL_MIDI_NOTE_OFFSETS[channelType],
})
