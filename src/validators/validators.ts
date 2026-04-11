import { CompanionActionEvent } from '@companion-module/base'

import {
	CHANNEL_COLOURS,
	CHANNEL_TYPES,
	CUE_LIST_COUNT,
	DCA_COUNT,
	FX_RETURN_COUNT,
	INPUT_CHANNEL_COUNT,
	MAIN_COUNT,
	MAX_TCP_PORT,
	MIN_TCP_PORT,
	MIXRACK_DX_SOCKET_COUNT,
	MIXRACK_SOCKET_COUNT,
	MONO_AUX_COUNT,
	MONO_FX_SEND_COUNT,
	MONO_GROUP_COUNT,
	MONO_MATRIX_COUNT,
	MUTE_GROUP_COUNT,
	PREAMP_MAXIMUM_GAIN,
	PREAMP_MINIMUM_GAIN,
	SCENE_COUNT,
	SOCKET_TYPES,
	STEREO_AUX_COUNT,
	STEREO_FX_SEND_COUNT,
	STEREO_GROUP_COUNT,
	STEREO_MATRIX_COUNT,
	STEREO_UFX_RETURN_COUNT,
	STEREO_UFX_SEND_COUNT,
} from '../constants.js'

/**
 * Lightweight runtime validation helpers.
 * These replace the Zod-based validators from the original module to avoid the Zod dependency.
 */

function assertString(val: unknown, name: string): string {
	if (typeof val !== 'string') throw new Error(`${name} must be a string, got ${typeof val}`)
	return val
}

function assertNumber(val: unknown, name: string, min?: number, max?: number): number {
	const n = typeof val === 'string' ? Number(val) : val
	if (typeof n !== 'number' || isNaN(n)) throw new Error(`${name} must be a number`)
	if (min !== undefined && n < min) throw new Error(`${name} must be >= ${min}`)
	if (max !== undefined && n > max) throw new Error(`${name} must be <= ${max}`)
	return n
}

function assertBoolean(val: unknown, name: string): boolean {
	if (typeof val !== 'boolean') throw new Error(`${name} must be a boolean, got ${typeof val}`)
	return val
}

function assertChannelType(val: unknown): ChannelType {
	const s = assertString(val, 'channelType')
	if (!(CHANNEL_TYPES as readonly string[]).includes(s)) throw new Error(`Invalid channel type: ${s}`)
	return s as ChannelType
}

function assertSocketType(val: unknown): SocketType {
	const s = assertString(val, 'socketType')
	if (!(SOCKET_TYPES as readonly string[]).includes(s)) throw new Error(`Invalid socket type: ${s}`)
	return s as SocketType
}

function opts(action: CompanionActionEvent): Record<string, unknown> {
	return (action as { options: Record<string, unknown> }).options
}

export const parseMuteAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return { ...action, options: { ...o, channelType: assertChannelType(o.channelType), mute: assertBoolean(o.mute, 'mute') } }
}

export const parseFaderLevelAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return { ...action, options: { ...o, channelType: assertChannelType(o.channelType), level: assertNumber(o.level, 'level', 0, 127) } }
}

export const parseAssignChannelToMainMixAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return { ...action, options: { ...o, channelType: assertChannelType(o.channelType), assign: assertBoolean(o.assign, 'assign') } }
}

export const parseAuxFxMatrixSendLevelAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return {
		...action,
		options: {
			...o,
			channelType: assertChannelType(o.channelType),
			destinationChannelType: assertChannelType(o.destinationChannelType),
			level: assertNumber(o.level, 'level', 0, 127),
		},
	}
}

export const parseInputToGroupAuxOnAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return {
		...action,
		options: {
			...o,
			input: assertNumber(o.input, 'input', 0, INPUT_CHANNEL_COUNT - 1),
			destinationChannelType: assertChannelType(o.destinationChannelType),
			on: assertBoolean(o.on, 'on'),
		},
	}
}

export const parseDcaAssignAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return {
		...action,
		options: {
			...o,
			channelType: assertChannelType(o.channelType),
			destinationDca: assertNumber(o.destinationDca, 'destinationDca', 0, DCA_COUNT - 1),
			assign: assertBoolean(o.assign, 'assign'),
		},
	}
}

export const parseMuteGroupAssignAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return {
		...action,
		options: {
			...o,
			channelType: assertChannelType(o.channelType),
			destinationMuteGroup: assertNumber(o.destinationMuteGroup, 'destinationMuteGroup', 0, MUTE_GROUP_COUNT - 1),
			assign: assertBoolean(o.assign, 'assign'),
		},
	}
}

export const parseSetSocketPreampGainAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return {
		...action,
		options: {
			...o,
			socketType: assertSocketType(o.socketType),
			gain: assertNumber(o.gain, 'gain', PREAMP_MINIMUM_GAIN, PREAMP_MAXIMUM_GAIN),
		},
	}
}

export const parseSetSocketPreampPadAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return { ...action, options: { ...o, socketType: assertSocketType(o.socketType), pad: assertBoolean(o.pad, 'pad') } }
}

export const parseSetSocketPreamp48vAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return { ...action, options: { ...o, socketType: assertSocketType(o.socketType), phantom: assertBoolean(o.phantom, 'phantom') } }
}

export const parseSetChannelNameAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return { ...action, options: { ...o, channelType: assertChannelType(o.channelType), name: assertString(o.name, 'name') } }
}

export const parseSetChannelColourAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return {
		...action,
		options: {
			...o,
			channelType: assertChannelType(o.channelType),
			colour: assertNumber(o.colour, 'colour', 0, CHANNEL_COLOURS.length - 1),
		},
	}
}

export const parseRecallSceneAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return { ...action, options: { ...o, scene: assertNumber(o.scene, 'scene', 0, SCENE_COUNT - 1) } }
}

export const parseRecallCueListAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return { ...action, options: { ...o, recallId: assertNumber(o.recallId, 'recallId', 0, CUE_LIST_COUNT - 1) } }
}

export const parseGoNextPreviousAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return {
		...action,
		options: {
			...o,
			controlNumber: assertNumber(o.controlNumber, 'controlNumber', 0, 127),
			controlValue: assertNumber(o.controlValue, 'controlValue', 0, 127),
		},
	}
}

export const parseParametricEqAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return { ...action, options: { ...o, channelType: assertChannelType(o.channelType), band: assertNumber(o.band, 'band', 0, 3) } }
}

export const parseHpfFrequencyAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return {
		...action,
		options: {
			...o,
			input: assertNumber(o.input, 'input', 0, INPUT_CHANNEL_COUNT - 1),
			frequency: assertNumber(o.frequency, 'frequency', 0, 127),
		},
	}
}

export const parseSetHpfOnOffAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return {
		...action,
		options: {
			...o,
			input: assertNumber(o.input, 'input', 0, INPUT_CHANNEL_COUNT - 1),
			hpf: assertBoolean(o.hpf, 'hpf'),
		},
	}
}

export const parseSetUfxGlobalKeyAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return { ...action, options: { ...o, key: assertNumber(o.key, 'key', 0, 11) } }
}

export const parseSetUfxGlobalScaleAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return { ...action, options: { ...o, scale: assertNumber(o.scale, 'scale', 0, 1) } }
}

export const parseSetUfxUnitParameterAction = (action: CompanionActionEvent) => {
	const o = opts(action)
	return {
		...action,
		options: {
			...o,
			midiChannel: assertNumber(o.midiChannel, 'midiChannel', 1, 16),
			controlNumber: assertNumber(o.controlNumber, 'controlNumber', 0, 127),
			controlValue: assertNumber(o.controlValue, 'controlValue', 0, 127),
		},
	}
}

export const parseDliveModuleConfig = (config: Record<string, unknown>): DLiveModuleConfig => {
	return {
		host: assertString(config.host, 'host'),
		midiChannel: assertNumber(config.midiChannel, 'midiChannel', 0, 11),
		midiPort: assertNumber(config.midiPort, 'midiPort', MIN_TCP_PORT, MAX_TCP_PORT),
	}
}
