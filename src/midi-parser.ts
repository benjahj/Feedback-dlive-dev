/**
 * Resolves a MIDI channel offset + note number back to a dLive channel type and number.
 * This is the inverse of the CHANNEL_MIDI_CHANNEL_OFFSETS / CHANNEL_MIDI_NOTE_OFFSETS tables.
 *
 * MIDI Channel Offset mapping:
 *   0: Input (note 0x00-0x7F)
 *   1: Mono Group (note 0x00-0x3D), Stereo Group (note 0x40-0x5E)
 *   2: Mono Aux (note 0x00-0x3D), Stereo Aux (note 0x40-0x5E)
 *   3: Mono Matrix (note 0x00-0x3D), Stereo Matrix (note 0x40-0x5E)
 *   4: Mono FX Send (0x00-0x0F), Stereo FX Send (0x10-0x1F), FX Return (0x20-0x2F),
 *      Main (0x30-0x35), DCA (0x36-0x4D), Mute Group (0x4E-0x55),
 *      Stereo UFX Send (0x56-0x5D), Stereo UFX Return (0x5E-0x65)
 */
export function resolveChannel(midiChannelOffset: number, noteNumber: number): ResolvedChannel | null {
	switch (midiChannelOffset) {
		case 0:
			return { channelType: 'input', channelNo: noteNumber }
		case 1:
			if (noteNumber >= 0x40) return { channelType: 'stereo_group', channelNo: noteNumber - 0x40 }
			return { channelType: 'mono_group', channelNo: noteNumber }
		case 2:
			if (noteNumber >= 0x40) return { channelType: 'stereo_aux', channelNo: noteNumber - 0x40 }
			return { channelType: 'mono_aux', channelNo: noteNumber }
		case 3:
			if (noteNumber >= 0x40) return { channelType: 'stereo_matrix', channelNo: noteNumber - 0x40 }
			return { channelType: 'mono_matrix', channelNo: noteNumber }
		case 4:
			if (noteNumber >= 0x5e) return { channelType: 'stereo_ufx_return', channelNo: noteNumber - 0x5e }
			if (noteNumber >= 0x56) return { channelType: 'stereo_ufx_send', channelNo: noteNumber - 0x56 }
			if (noteNumber >= 0x4e) return { channelType: 'mute_group', channelNo: noteNumber - 0x4e }
			if (noteNumber >= 0x36) return { channelType: 'dca', channelNo: noteNumber - 0x36 }
			if (noteNumber >= 0x30) return { channelType: 'main', channelNo: noteNumber - 0x30 }
			if (noteNumber >= 0x20) return { channelType: 'fx_return', channelNo: noteNumber - 0x20 }
			if (noteNumber >= 0x10) return { channelType: 'stereo_fx_send', channelNo: noteNumber - 0x10 }
			return { channelType: 'mono_fx_send', channelNo: noteNumber }
		default:
			return null
	}
}

export interface MidiMessage {
	type: 'note_on' | 'note_off' | 'cc' | 'program_change' | 'pitch_bend' | 'sysex'
	channel: number
	data1: number
	data2: number
	sysexData?: number[]
}

/**
 * Parses raw MIDI bytes from TCP stream into discrete MIDI messages.
 * Handles running status and SysEx messages.
 */
export class MidiStreamParser {
	private buffer: number[] = []
	private runningStatus = 0
	private inSysex = false
	private sysexBuffer: number[] = []

	parse(data: Buffer): MidiMessage[] {
		const messages: MidiMessage[] = []

		for (let i = 0; i < data.length; i++) {
			const byte = data[i]

			// SysEx handling
			if (this.inSysex) {
				this.sysexBuffer.push(byte)
				if (byte === 0xf7) {
					messages.push({
						type: 'sysex',
						channel: 0,
						data1: 0,
						data2: 0,
						sysexData: [...this.sysexBuffer],
					})
					this.inSysex = false
					this.sysexBuffer = []
				}
				continue
			}

			if (byte === 0xf0) {
				this.inSysex = true
				this.sysexBuffer = [0xf0]
				continue
			}

			// Skip system realtime messages (0xF8-0xFF)
			if (byte >= 0xf8) continue

			// Status byte
			if (byte & 0x80) {
				this.runningStatus = byte
				this.buffer = []
				continue
			}

			// Data byte
			this.buffer.push(byte)

			const statusType = this.runningStatus & 0xf0
			const channel = this.runningStatus & 0x0f

			// Messages with 1 data byte
			if (statusType === 0xc0 || statusType === 0xd0) {
				if (this.buffer.length >= 1) {
					messages.push({
						type: statusType === 0xc0 ? 'program_change' : 'cc',
						channel,
						data1: this.buffer[0],
						data2: 0,
					})
					this.buffer = []
				}
				continue
			}

			// Messages with 2 data bytes
			if (this.buffer.length >= 2) {
				let type: MidiMessage['type']
				switch (statusType) {
					case 0x80: type = 'note_off'; break
					case 0x90: type = this.buffer[1] === 0 ? 'note_off' : 'note_on'; break
					case 0xb0: type = 'cc'; break
					case 0xe0: type = 'pitch_bend'; break
					default: type = 'cc'; break
				}
				messages.push({ type, channel, data1: this.buffer[0], data2: this.buffer[1] })
				this.buffer = []
			}
		}

		return messages
	}

	reset(): void {
		this.buffer = []
		this.runningStatus = 0
		this.inSysex = false
		this.sysexBuffer = []
	}
}
