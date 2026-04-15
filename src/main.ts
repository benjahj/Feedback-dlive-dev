import { InstanceBase, Regex, runEntrypoint, SomeCompanionConfigField, TCPHelper } from '@companion-module/base'
import { indexOf } from 'lodash/fp'

import { UpdateActions } from './actions.js'
import {
	CUE_LISTS_PER_BANK,
	DEFAULT_MIDI_CHANNEL,
	DEFAULT_MIDI_TCP_PORT,
	DEFAULT_TARGET_IP,
	EQ_PARAMETER_MIDI_VALUES_FOR_BANDS,
	EQ_TYPES,
	MAIN_MIDI_CHANNEL_CHOICES,
	MAX_TCP_PORT,
	MIN_TCP_PORT,
	SCENES_PER_BANK,
	SOCKET_MIDI_NOTE_OFFSETS,
	SYSEX_HEADER,
} from './constants.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { MidiStreamParser, resolveChannel } from './midi-parser.js'
import { DLiveState } from './state.js'
import {
	eqGainToMidiValue,
	eqWidthToMidiValue,
	getMidiOffsetsForChannelType,
	preampGainToMidiValue,
	stringToMidiBytes,
} from './utils/index.js'
import { parseDliveModuleConfig } from './validators/index.js'
import { UpdateVariableDefinitions, UpdateVariableValues } from './variables.js'

export class ModuleInstance extends InstanceBase<DLiveModuleConfig> {
	config?: DLiveModuleConfig
	midiSocket?: TCPHelper
	state: DLiveState = new DLiveState()

	private midiParser: MidiStreamParser = new MidiStreamParser()
	private nrpnState: Map<number, { msb: number; lsb: number }> = new Map()

	get baseMidiChannel(): number {
		return this.config?.midiChannel ?? 0
	}

	constructor(internal: unknown) {
		super(internal)
	}

	async init(initialConfig: Record<string, unknown>): Promise<void> {
		this.log('info', `Initialising Feedback dLive Dev module`)
		try {
			this.config = parseDliveModuleConfig(initialConfig)
		} catch (error) {
			this.log('error', `Unable to parse config: ${JSON.stringify(error)}`)
		}
		UpdateActions(this)
		UpdateFeedbacks(this)
		UpdateVariableDefinitions(this)
		UpdateVariableValues(this)
		this.initialiseMidi()
	}

	async configUpdated(updatedConfig: Record<string, unknown>): Promise<void> {
		this.log('info', `Updating config`)
		try {
			this.config = parseDliveModuleConfig(updatedConfig)
		} catch (error) {
			this.log('error', `Unable to parse config: ${JSON.stringify(error)}`)
		}
		UpdateActions(this)
		UpdateFeedbacks(this)
		UpdateVariableDefinitions(this)
		UpdateVariableValues(this)
		this.initialiseMidi()
	}

	async destroy(): Promise<void> {
		this.log('debug', `Destroying module`)
		this.destroyMidiSocket()
		this.state.clear()
	}

	initialiseMidi(): void {
		if (!this.config) {
			this.log('error', 'Unable to initialise MIDI, no config')
			return
		}
		this.destroyMidiSocket()
		this.midiParser.reset()
		this.nrpnState.clear()
		this.state.clear()

		const { host, midiPort } = this.config
		this.midiSocket = new TCPHelper(host, midiPort)
			.on('status_change', (status, message) => {
				this.updateStatus(status, message)
			})
			.on('error', (err) => {
				this.log('error', 'MIDI error: ' + err.message)
			})
			.on('connect', () => {
				this.log('debug', `MIDI Connected to ${host}`)
			})
			.on('data', (data) => {
				try {
					this.handleMidiData(data)
				} catch (error) {
					this.log(
						'error',
						`Error processing incoming MIDI: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
					)
				}
			})
	}

	/**
	 * Parse incoming MIDI data from the dLive and update internal state.
	 * This is the core feedback mechanism - the dLive mirrors state changes
	 * as MIDI messages which we decode to track mute/fader/etc state.
	 */
	handleMidiData(data: Buffer): void {
		const messages = this.midiParser.parse(data)
		let stateChanged = false

		for (const msg of messages) {
			const midiChannelOffset = msg.channel - this.baseMidiChannel
			if (midiChannelOffset < 0 || midiChannelOffset > 4) continue

			if (msg.type === 'note_on' || msg.type === 'note_off') {
				// Note On/Off = Mute status
				// velocity 0x7F (127) = MUTED, velocity <= 0x3F (63) = UNMUTED
				const resolved = resolveChannel(midiChannelOffset, msg.data1)
				if (resolved) {
					const isMuted = msg.type === 'note_on' && msg.data2 >= 0x40
					this.state.setMuteState(resolved.channelType, resolved.channelNo, isMuted)
					this.log('debug', `Mute ${resolved.channelType} ${resolved.channelNo + 1}: ${isMuted ? 'ON' : 'OFF'}`)
					stateChanged = true
				}
			} else if (msg.type === 'sysex' && msg.sysexData) {
				// SysEx messages - parse send on/off state (message type 0x0E)
				const d = msg.sysexData
				// Format: F0 00 00 1A 50 10 01 00 <srcCh> <msgType> <srcNote> <dstCh> <dstNote> <value> F7
				if (d.length >= 14 && d[0] === 0xf0 && d[1] === 0x00 && d[2] === 0x00 && d[3] === 0x1a &&
					d[4] === 0x50 && d[5] === 0x10 && d[6] === 0x01 && d[7] === 0x00) {
					const srcChOffset = d[8] - this.baseMidiChannel
					const msgType = d[9]
					const srcNote = d[10]
					const dstChOffset = d[11] - this.baseMidiChannel
					const dstNote = d[12]
					const value = d[13]

					if (msgType === 0x0e) {
						// Send on/off
						const src = resolveChannel(srcChOffset, srcNote)
						const dst = resolveChannel(dstChOffset, dstNote)
						if (src && dst) {
							const isEnabled = value >= 0x40
							this.state.setSendState(src.channelType, src.channelNo, dst.channelType, dst.channelNo, isEnabled)
							this.log('debug', `Send ${src.channelType} ${src.channelNo + 1} -> ${dst.channelType} ${dst.channelNo + 1}: ${isEnabled ? 'ON' : 'OFF'}`)
							stateChanged = true
						}
					}
				}
			} else if (msg.type === 'cc') {
				// Control Change = NRPN messages (fader levels, assignments, etc.)
				const cc = msg.data1
				const value = msg.data2

				// Track NRPN state per MIDI channel
				if (!this.nrpnState.has(msg.channel)) {
					this.nrpnState.set(msg.channel, { msb: 0, lsb: 0 })
				}
				const nrpn = this.nrpnState.get(msg.channel)!

				if (cc === 0x63) {
					// NRPN MSB (CC 99) = channel/note number
					nrpn.msb = value
				} else if (cc === 0x62) {
					// NRPN LSB (CC 98) = parameter ID
					nrpn.lsb = value
				} else if (cc === 0x06) {
					// Data Entry MSB (CC 6) = parameter value
					if (nrpn.lsb === 0x17) {
						// Fader level parameter
						const resolved = resolveChannel(midiChannelOffset, nrpn.msb)
						if (resolved) {
							this.state.setFaderLevel(resolved.channelType, resolved.channelNo, value)
							this.log('debug', `Fader ${resolved.channelType} ${resolved.channelNo + 1}: ${value}`)
							stateChanged = true
						}
					}
				}
			}
		}

		if (stateChanged) {
			this.checkFeedbacks('channelMute', 'faderLevel', 'muteGroupActive', 'dcaMute', 'inputMute', 'channelSendActive')
			UpdateVariableValues(this)
		}
	}

	sendMidiToDlive(midiMessage: number[]): void {
		if (!this.midiSocket) {
			this.log('error', 'no midi socket')
			return
		}
		this.log('debug', `Sending MIDI: ${midiMessage.map((b) => b.toString(16).padStart(2, '0')).join(' ')}`)
		try {
			void this.midiSocket.send(Buffer.from(midiMessage))
		} catch (error) {
			this.log('error', `Error sending MIDI: ${JSON.stringify(error)}`)
		}
	}

	destroyMidiSocket(): void {
		this.midiSocket?.destroy()
		delete this.midiSocket
	}

	processCommand({ command, params }: DLiveCommand): void {
		this.log('debug', `Processing command: ${command} with params ${JSON.stringify(params)}`)

		try {
			switch (command) {
				case 'mute_on': {
					const { channelNo, channelType } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0x90 + this.baseMidiChannel + midiChannelOffset,
						channelNo + midiNoteOffset,
						0x7f,
						channelNo + midiNoteOffset,
						0x00,
					])
					break
				}

				case 'mute_off': {
					const { channelNo, channelType } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0x90 + this.baseMidiChannel + midiChannelOffset,
						channelNo + midiNoteOffset,
						0x3f,
						channelNo + midiNoteOffset,
						0x00,
					])
					break
				}

				case 'fader_level': {
					const { channelNo, channelType, level } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63, channelNo + midiNoteOffset,
						0x62, 0x17,
						0x06, level,
					])
					break
				}

				case 'channel_assignment_to_main_mix_on': {
					const { channelNo, channelType } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63, channelNo + midiNoteOffset,
						0x62, 0x18,
						0x06, 0x7f,
					])
					break
				}

				case 'channel_assignment_to_main_mix_off': {
					const { channelNo, channelType } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63, channelNo + midiNoteOffset,
						0x62, 0x18,
						0x06, 0x3f,
					])
					break
				}

				case 'aux_fx_matrix_send_level': {
					const { channelNo, channelType, destinationChannelNo, destinationChannelType, level } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					const { midiChannelOffset: destChOffset, midiNoteOffset: destNoteOffset } =
						getMidiOffsetsForChannelType(destinationChannelType)
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel + midiChannelOffset,
						0x0d,
						channelNo + midiNoteOffset,
						this.baseMidiChannel + destChOffset,
						destinationChannelNo + destNoteOffset,
						level,
						0xf7,
					])
					break
				}

				case 'input_to_group_aux_on': {
					const { channelNo, destinationChannelNo, destinationChannelType, shouldEnable } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType('input')
					const { midiChannelOffset: destChOffset, midiNoteOffset: destNoteOffset } =
						getMidiOffsetsForChannelType(destinationChannelType)
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel + midiChannelOffset,
						0x0e,
						channelNo + midiNoteOffset,
						this.baseMidiChannel + destChOffset,
						destinationChannelNo + destNoteOffset,
						shouldEnable ? 0x40 : 0x00,
						0xf7,
					])
					break
				}

				case 'channel_send_on_off': {
					const { channelNo, channelType, destinationChannelNo, destinationChannelType, shouldEnable } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					const { midiChannelOffset: destChOffset, midiNoteOffset: destNoteOffset } =
						getMidiOffsetsForChannelType(destinationChannelType)
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel + midiChannelOffset,
						0x0e,
						channelNo + midiNoteOffset,
						this.baseMidiChannel + destChOffset,
						destinationChannelNo + destNoteOffset,
						shouldEnable ? 0x40 : 0x00,
						0xf7,
					])
					break
				}

				case 'dca_assignment_on': {
					const { channelNo, channelType, dcaNo } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63, channelNo + midiNoteOffset,
						0x62, 0x40,
						0x06, dcaNo + 0x40,
					])
					break
				}

				case 'dca_assignment_off': {
					const { channelNo, channelType, dcaNo } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63, channelNo + midiNoteOffset,
						0x62, 0x40,
						0x06, dcaNo,
					])
					break
				}

				case 'mute_group_assignment_on': {
					const { channelNo, channelType, muteGroupNo } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63, channelNo + midiNoteOffset,
						0x62, 0x40,
						0x06, muteGroupNo + 0x58,
					])
					break
				}

				case 'mute_group_assignment_off': {
					const { channelNo, channelType, muteGroupNo } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63, channelNo + midiNoteOffset,
						0x62, 0x40,
						0x06, muteGroupNo + 0x18,
					])
					break
				}

				case 'set_socket_preamp_gain': {
					const { socketNo, socketType, gain } = params
					const midiNoteOffset = SOCKET_MIDI_NOTE_OFFSETS[socketType]
					const gainMidiValue = preampGainToMidiValue(gain)
					this.sendMidiToDlive([0xe0 + this.baseMidiChannel, socketNo + midiNoteOffset, gainMidiValue])
					break
				}

				case 'set_socket_preamp_pad': {
					const { socketNo, socketType, shouldEnable } = params
					const midiNoteOffset = SOCKET_MIDI_NOTE_OFFSETS[socketType]
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel, 0x09, socketNo + midiNoteOffset,
						shouldEnable ? 0x40 : 0x00, 0xf7,
					])
					break
				}

				case 'set_socket_preamp_48v': {
					const { socketNo, socketType, shouldEnable } = params
					const midiNoteOffset = SOCKET_MIDI_NOTE_OFFSETS[socketType]
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel, 0x0c, socketNo + midiNoteOffset,
						shouldEnable ? 0x40 : 0x00, 0xf7,
					])
					break
				}

				case 'set_channel_name': {
					const { channelNo, channelType, name } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel + midiChannelOffset,
						0x03, channelNo + midiNoteOffset,
						...stringToMidiBytes(name), 0xf7,
					])
					break
				}

				case 'set_channel_colour': {
					const { channelNo, channelType, colour } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					this.sendMidiToDlive([
						...SYSEX_HEADER,
						this.baseMidiChannel + midiChannelOffset,
						0x06, channelNo + midiNoteOffset, colour, 0xf7,
					])
					break
				}

				case 'scene_recall': {
					const { sceneNo } = params
					const sceneBankNo = Math.floor(sceneNo / SCENES_PER_BANK)
					const sceneNoInBank = sceneNo % SCENES_PER_BANK
					this.sendMidiToDlive([0xb0 + this.baseMidiChannel, 0x00, sceneBankNo, 0xc0, sceneNoInBank])
					break
				}

				case 'cue_list_recall': {
					const { recallId } = params
					const recallBankNo = Math.min(0x0f, Math.floor(recallId / CUE_LISTS_PER_BANK))
					const recallIdInBank = recallId % CUE_LISTS_PER_BANK
					this.sendMidiToDlive([0xb0 + this.baseMidiChannel, 0x00, recallBankNo, 0xc0, recallIdInBank])
					break
				}

				case 'go_next_previous': {
					const { controlNumber, controlValue } = params
					this.sendMidiToDlive([0xb0 + this.baseMidiChannel, controlNumber, controlValue])
					break
				}

				case 'parametric_eq': {
					const { channelNo, channelType, bandNo, frequency, type, gain, width } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType(channelType)
					const gainMidiValue = eqGainToMidiValue(gain)
					const widthMidiValue = eqWidthToMidiValue(width)
					const typeMidiValue = indexOf(type, EQ_TYPES)
					const paramVals = EQ_PARAMETER_MIDI_VALUES_FOR_BANDS[bandNo]
					const ch = 0xb0 + this.baseMidiChannel + midiChannelOffset
					const note = channelNo + midiNoteOffset

					this.sendMidiToDlive([ch, 0x63, note, 0x62, paramVals.type, 0x06, typeMidiValue])
					this.sendMidiToDlive([ch, 0x63, note, 0x62, paramVals.frequency, 0x06, frequency])
					this.sendMidiToDlive([ch, 0x63, note, 0x62, paramVals.width, 0x06, widthMidiValue])
					this.sendMidiToDlive([ch, 0x63, note, 0x62, paramVals.gain, 0x06, gainMidiValue])
					break
				}

				case 'hpf_frequency': {
					const { channelNo, frequency } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType('input')
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63, channelNo + midiNoteOffset,
						0x62, 0x30,
						0x06, frequency,
					])
					break
				}

				case 'set_hpf_on_off': {
					const { channelNo, shouldEnable } = params
					const { midiChannelOffset, midiNoteOffset } = getMidiOffsetsForChannelType('input')
					this.sendMidiToDlive([
						0xb0 + this.baseMidiChannel + midiChannelOffset,
						0x63, channelNo + midiNoteOffset,
						0x62, 0x31,
						0x06, shouldEnable ? 0x40 : 0x00,
					])
					break
				}
			}
		} catch (error) {
			this.log('error', `Error sending command: ${JSON.stringify(error)}`)
		}
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'Allen & Heath dLive module with Feedback support. Tracks mute status, fader levels, DCA and Mute Group states via incoming MIDI data.',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				tooltip: 'Default for surface is 192.168.1.71, default for mixrack is 192.168.1.70',
				width: 6,
				default: DEFAULT_TARGET_IP,
				regex: Regex.IP,
			},
			{
				type: 'number',
				id: 'midiPort',
				label: 'MIDI Port',
				width: 6,
				tooltip: 'Default for surface is 51328, default for mixrack is 51325',
				default: DEFAULT_MIDI_TCP_PORT,
				min: MIN_TCP_PORT,
				max: MAX_TCP_PORT,
			},
			{
				type: 'dropdown',
				id: 'midiChannel',
				label: 'Main MIDI Channels',
				width: 6,
				default: DEFAULT_MIDI_CHANNEL,
				choices: MAIN_MIDI_CHANNEL_CHOICES,
			},
		]
	}
}

runEntrypoint(ModuleInstance, [])
