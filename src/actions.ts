import { camelCase, includes } from 'lodash/fp'

import {
	CHANNEL_COLOUR_CHOICES,
	CUE_LIST_COUNT,
	DCA_COUNT,
	EQ_FREQUENCY_CHOICES,
	EQ_MAXIMUM_GAIN,
	EQ_MAXIMUM_WIDTH,
	EQ_MINIMUM_GAIN,
	EQ_MINIMUM_WIDTH,
	EQ_TYPE_CHOICES,
	FADER_LEVEL_CHOICES,
	HPF_FREQUENCY_CHOICES,
	INPUT_CHANNEL_COUNT,
	MUTE_GROUP_COUNT,
	PREAMP_MAXIMUM_GAIN,
	PREAMP_MINIMUM_GAIN,
	SCENE_COUNT,
} from './constants.js'
import { ModuleInstance } from './main.js'
import { getChannelSelectOptions, getSocketSelectOptions, makeDropdownChoices } from './utils/index.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Opts = Record<string, any>

export const UpdateActions = (companionModule: ModuleInstance): void => {
	companionModule.setActionDefinitions({
		mute: {
			name: 'Mute',
			description: 'Mute or unmute a channel',
			options: [
				...getChannelSelectOptions(),
				{ type: 'checkbox', label: 'Mute', id: 'mute', default: true },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({
					command: o.mute ? 'mute_on' : 'mute_off',
					params: {
						channelType: o.channelType,
						channelNo: o[camelCase(o.channelType)],
					},
				})
			},
		},

		faderLevel: {
			name: 'Fader Level',
			description: 'Set the fader level of a channel',
			options: [
				...getChannelSelectOptions({ exclude: ['mute_group'] }),
				{ type: 'dropdown', label: 'Level', id: 'level', default: 0, choices: FADER_LEVEL_CHOICES, minChoicesForSearch: 0 },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({
					command: 'fader_level',
					params: {
						channelType: o.channelType,
						channelNo: o[camelCase(o.channelType)],
						level: o.level,
					},
				})
			},
		},

		assignToMainMix: {
			name: 'Assign a channel to the main mix',
			options: [
				...getChannelSelectOptions({ include: ['input', 'mono_group', 'stereo_group', 'fx_return', 'stereo_ufx_return'] }),
				{ type: 'checkbox', label: 'Assign to Main Mix', id: 'assign', default: true },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({
					command: o.assign ? 'channel_assignment_to_main_mix_on' : 'channel_assignment_to_main_mix_off',
					params: {
						channelType: o.channelType,
						channelNo: o[camelCase(o.channelType)],
					},
				})
			},
		},

		auxFxMatrixSendLevel: {
			name: 'Aux / FX / Matrix Send Level',
			description: 'Set the send level from a channel to an aux / fx send / matrix',
			options: [
				...getChannelSelectOptions({ include: ['input', 'mono_group', 'stereo_group', 'fx_return', 'stereo_ufx_return'] }),
				...getChannelSelectOptions({
					prefix: 'destination',
					include: ['mono_aux', 'stereo_aux', 'mono_fx_send', 'stereo_fx_send', 'mono_matrix', 'stereo_matrix', 'stereo_ufx_send'],
				}),
				{ type: 'dropdown', label: 'Level', id: 'level', default: 0, choices: FADER_LEVEL_CHOICES, minChoicesForSearch: 0 },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({
					command: 'aux_fx_matrix_send_level',
					params: {
						channelType: o.channelType,
						channelNo: o[camelCase(o.channelType)],
						destinationChannelType: o.destinationChannelType,
						destinationChannelNo: o[camelCase(`destination_${o.destinationChannelType}`)],
						level: o.level,
					},
				})
			},
		},

		inputToGroupAuxToggle: {
			name: 'Toggle Input to Group / Aux / Matrix',
			description: 'Toggle an input send to a group / aux / matrix on/off. Each press flips the current state.',
			options: [
				{ type: 'dropdown', label: 'Input Channel', id: 'input', default: 0, choices: makeDropdownChoices('Input Channel', INPUT_CHANNEL_COUNT), minChoicesForSearch: 0 },
				...getChannelSelectOptions({ prefix: 'destination', include: ['mono_group', 'stereo_group', 'mono_aux', 'stereo_aux', 'mono_matrix', 'stereo_matrix'] }),
			],
			callback: async (action) => {
				const o = action.options as Opts
				const dstType = o.destinationChannelType as ChannelType
				const dstNo = o[camelCase(`destination_${dstType}`)] as number
				const currentState = companionModule.state.getSendState('input', o.input, dstType, dstNo)
				companionModule.processCommand({
					command: 'input_to_group_aux_on',
					params: {
						channelNo: o.input,
						destinationChannelType: dstType,
						destinationChannelNo: dstNo,
						shouldEnable: !currentState,
					},
				})
			},
		},

		channelSendToggle: {
			name: 'Toggle Send On/Off',
			description: 'Toggle a send on/off from any channel to an Aux, FX Send, Matrix, or Group. Each press flips the current state.',
			options: [
				...getChannelSelectOptions({
					include: ['input', 'mono_group', 'stereo_group', 'fx_return', 'stereo_ufx_return'],
				}),
				...getChannelSelectOptions({
					prefix: 'destination',
					include: ['mono_group', 'stereo_group', 'mono_aux', 'stereo_aux', 'mono_fx_send', 'stereo_fx_send', 'mono_matrix', 'stereo_matrix', 'stereo_ufx_send'],
				}),
			],
			callback: async (action) => {
				const o = action.options as Opts
				const srcType = o.channelType as ChannelType
				const srcNo = o[camelCase(srcType)] as number
				const dstType = o.destinationChannelType as ChannelType
				const dstNo = o[camelCase(`destination_${dstType}`)] as number
				const currentState = companionModule.state.getSendState(srcType, srcNo, dstType, dstNo)
				companionModule.processCommand({
					command: 'channel_send_on_off',
					params: {
						channelType: srcType,
						channelNo: srcNo,
						destinationChannelType: dstType,
						destinationChannelNo: dstNo,
						shouldEnable: !currentState,
					},
				})
			},
		},

		dcaAssign: {
			name: 'Assign to DCA',
			description: 'Assign a channel to a DCA',
			options: [
				...getChannelSelectOptions({ exclude: ['dca', 'mute_group'] }),
				{ type: 'dropdown', label: 'DCA', id: 'destinationDca', default: 0, choices: makeDropdownChoices('DCA', DCA_COUNT), minChoicesForSearch: 0 },
				{ type: 'checkbox', label: 'Assign to DCA', id: 'assign', default: true },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({
					command: o.assign ? 'dca_assignment_on' : 'dca_assignment_off',
					params: {
						channelType: o.channelType,
						channelNo: o[camelCase(o.channelType)],
						dcaNo: o.destinationDca,
					},
				})
			},
		},

		muteGroupAssign: {
			name: 'Assign to Mute Group',
			description: 'Assign a channel to a mute group',
			options: [
				...getChannelSelectOptions({ exclude: ['dca', 'mute_group'] }),
				{ type: 'dropdown', label: 'Mute Group', id: 'destinationMuteGroup', default: 0, choices: makeDropdownChoices('Mute Group', MUTE_GROUP_COUNT), minChoicesForSearch: 0 },
				{ type: 'checkbox', label: 'Assign to Mute Group', id: 'assign', default: true },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({
					command: o.assign ? 'mute_group_assignment_on' : 'mute_group_assignment_off',
					params: {
						channelType: o.channelType,
						channelNo: o[camelCase(o.channelType)],
						muteGroupNo: o.destinationMuteGroup,
					},
				})
			},
		},

		setSocketPreampGain: {
			name: 'Set Socket Preamp Gain',
			description: 'Set the preamp gain of a MixRack or DX card socket',
			options: [
				...getSocketSelectOptions(),
				{ type: 'number', label: 'Gain', id: 'gain', default: 5, min: PREAMP_MINIMUM_GAIN, max: PREAMP_MAXIMUM_GAIN, range: true, step: 0.5 },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({
					command: 'set_socket_preamp_gain',
					params: {
						socketType: o.socketType,
						socketNo: o[camelCase(o.socketType)],
						gain: o.gain,
					},
				})
			},
		},

		setSocketPreampPad: {
			name: 'Set Socket Preamp Pad',
			description: 'Enable or disable the pad of a MixRack or DX card socket',
			options: [
				...getSocketSelectOptions(),
				{ type: 'checkbox', label: 'Pad', id: 'pad', default: true },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({
					command: 'set_socket_preamp_pad',
					params: {
						socketType: o.socketType,
						socketNo: o[camelCase(o.socketType)],
						shouldEnable: o.pad,
					},
				})
			},
		},

		setSocketPreamp48v: {
			name: 'Set Socket Preamp 48v',
			description: 'Enable or disable 48v of a MixRack or DX card socket',
			options: [
				...getSocketSelectOptions(),
				{ type: 'checkbox', label: '48V', id: 'phantom', default: true },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({
					command: 'set_socket_preamp_48v',
					params: {
						socketType: o.socketType,
						socketNo: o[camelCase(o.socketType)],
						shouldEnable: o.phantom,
					},
				})
			},
		},

		setChannelName: {
			name: 'Set Channel Name',
			description: 'Set the name of a channel',
			options: [
				...getChannelSelectOptions(),
				{ type: 'textinput', label: 'Name', id: 'name', default: '' },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({
					command: 'set_channel_name',
					params: {
						channelType: o.channelType,
						channelNo: o[camelCase(o.channelType)],
						name: o.name,
					},
				})
			},
		},

		setChannelColour: {
			name: 'Set Channel Colour',
			description: 'Set the colour of a channel',
			options: [
				...getChannelSelectOptions({ exclude: ['mute_group'] }),
				{ type: 'dropdown', label: 'Colour', id: 'colour', default: 0, choices: CHANNEL_COLOUR_CHOICES },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({
					command: 'set_channel_colour',
					params: {
						channelType: o.channelType,
						channelNo: o[camelCase(o.channelType)],
						colour: o.colour,
					},
				})
			},
		},

		recallScene: {
			name: 'Recall Scene',
			description: 'Recall a scene',
			options: [
				{ type: 'dropdown', label: 'Scene', id: 'scene', default: 0, choices: makeDropdownChoices('Scene', SCENE_COUNT), minChoicesForSearch: 0 },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({ command: 'scene_recall', params: { sceneNo: o.scene } })
			},
		},

		recallCueList: {
			name: 'Recall Cue List',
			description: 'Recall a cue list',
			options: [
				{ type: 'dropdown', label: 'Recall ID', id: 'recallId', default: 0, choices: makeDropdownChoices('ID', CUE_LIST_COUNT, { labelOffset: -1 }), minChoicesForSearch: 0 },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({ command: 'cue_list_recall', params: { recallId: o.recallId } })
			},
		},

		goNextPrevious: {
			name: 'Go Next/Previous (Surface Only)',
			description: 'Trigger the Go/Next/Previous action',
			options: [
				{ type: 'number', min: 0, max: 127, label: 'Control Number', id: 'controlNumber', default: 0 },
				{ type: 'number', min: 0, max: 127, label: 'Control Value', id: 'controlValue', default: 0 },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({
					command: 'go_next_previous',
					params: { controlNumber: o.controlNumber, controlValue: o.controlValue },
				})
			},
		},

		parametricEq: {
			name: 'Parametric EQ',
			description: 'Set the type, frequency, width and gain of a parametric EQ band',
			options: [
				...getChannelSelectOptions({ exclude: ['mute_group', 'dca', 'mono_fx_send', 'stereo_fx_send', 'stereo_ufx_send', 'stereo_ufx_return'] }),
				{ type: 'dropdown', label: 'Band', id: 'band', default: 0, choices: makeDropdownChoices('Band', 4), minChoicesForSearch: 0 },
				{ type: 'dropdown', label: 'Type', id: 'band0Type', default: 'bell', choices: EQ_TYPE_CHOICES.filter((c) => !includes(c.id, ['hf_shelf', 'low_pass'])), minChoicesForSearch: 0, isVisibleExpression: `$(options:band) == 0` },
				{ type: 'dropdown', label: 'Type', id: 'band3Type', default: 'bell', choices: EQ_TYPE_CHOICES.filter((c) => !includes(c.id, ['lf_shelf', 'high_pass'])), minChoicesForSearch: 0, isVisibleExpression: `$(options:band) == 3` },
				{ type: 'dropdown', label: 'Frequency', id: 'band0Frequency', default: 72, choices: EQ_FREQUENCY_CHOICES, isVisibleExpression: `$(options:band) == 0` },
				{ type: 'dropdown', label: 'Frequency', id: 'band1Frequency', default: 72, choices: EQ_FREQUENCY_CHOICES, isVisibleExpression: `$(options:band) == 1` },
				{ type: 'dropdown', label: 'Frequency', id: 'band2Frequency', default: 72, choices: EQ_FREQUENCY_CHOICES, isVisibleExpression: `$(options:band) == 2` },
				{ type: 'dropdown', label: 'Frequency', id: 'band3Frequency', default: 72, choices: EQ_FREQUENCY_CHOICES, isVisibleExpression: `$(options:band) == 3` },
				{ type: 'number', label: 'Width', id: 'band0Width', default: 1, max: EQ_MAXIMUM_WIDTH, min: EQ_MINIMUM_WIDTH, step: 0.05, range: true, isVisibleExpression: `$(options:band) == 0 && $(options:band0Type) == 'bell'` },
				{ type: 'number', label: 'Width', id: 'band1Width', default: 1, max: EQ_MAXIMUM_WIDTH, min: EQ_MINIMUM_WIDTH, step: 0.05, range: true, isVisibleExpression: `$(options:band) == 1` },
				{ type: 'number', label: 'Width', id: 'band2Width', default: 1, max: EQ_MAXIMUM_WIDTH, min: EQ_MINIMUM_WIDTH, step: 0.05, range: true, isVisibleExpression: `$(options:band) == 2` },
				{ type: 'number', label: 'Width', id: 'band3Width', default: 1, max: EQ_MAXIMUM_WIDTH, min: EQ_MINIMUM_WIDTH, step: 0.05, range: true, isVisibleExpression: `$(options:band) == 3 && $(options:band3Type) == 'bell'` },
				{ type: 'number', label: 'Gain', id: 'band0Gain', default: 0, min: EQ_MINIMUM_GAIN, max: EQ_MAXIMUM_GAIN, range: true, step: 0.5, isVisibleExpression: `$(options:band) == 0 && $(options:band0Type) != 'high_pass' && $(options:band0Type) != 'low_pass'` },
				{ type: 'number', label: 'Gain', id: 'band1Gain', default: 0, min: EQ_MINIMUM_GAIN, max: EQ_MAXIMUM_GAIN, range: true, step: 0.5, isVisibleExpression: `$(options:band) == 1` },
				{ type: 'number', label: 'Gain', id: 'band2Gain', default: 0, min: EQ_MINIMUM_GAIN, max: EQ_MAXIMUM_GAIN, range: true, step: 0.5, isVisibleExpression: `$(options:band) == 2` },
				{ type: 'number', label: 'Gain', id: 'band3Gain', default: 0, min: EQ_MINIMUM_GAIN, max: EQ_MAXIMUM_GAIN, range: true, step: 0.5, isVisibleExpression: `$(options:band) == 3 && $(options:band3Type) != 'high_pass' && $(options:band3Type) != 'low_pass'` },
			],
			callback: async (action) => {
				const o = action.options as Opts
				const typeMap: Record<number, EqType> = { 0: o.band0Type, 1: 'bell', 2: 'bell', 3: o.band3Type }
				const frequencyMap: Record<number, number> = { 0: o.band0Frequency, 1: o.band1Frequency, 2: o.band2Frequency, 3: o.band3Frequency }
				const widthMap: Record<number, number> = { 0: o.band0Width, 1: o.band1Width, 2: o.band2Width, 3: o.band3Width }
				const gainMap: Record<number, number> = { 0: o.band0Gain, 1: o.band1Gain, 2: o.band2Gain, 3: o.band3Gain }
				const band = o.band as number

				companionModule.processCommand({
					command: 'parametric_eq',
					params: {
						channelType: o.channelType,
						channelNo: o[camelCase(o.channelType)],
						bandNo: band,
						type: typeMap[band],
						frequency: frequencyMap[band],
						width: widthMap[band],
						gain: gainMap[band],
					},
				})
			},
		},

		hpfFrequency: {
			name: 'HPF Frequency',
			description: 'Set the high pass filter frequency of an input channel',
			options: [
				{ type: 'dropdown', label: 'Input Channel', id: 'input', default: 0, choices: makeDropdownChoices('Input Channel', INPUT_CHANNEL_COUNT), minChoicesForSearch: 0 },
				{ type: 'dropdown', label: 'Frequency', id: 'frequency', default: 72, choices: HPF_FREQUENCY_CHOICES },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({ command: 'hpf_frequency', params: { channelNo: o.input, frequency: o.frequency } })
			},
		},

		setHpfOnOff: {
			name: 'Set HPF On/Off',
			description: 'Enable or disable the high pass filter of an input channel',
			options: [
				{ type: 'dropdown', label: 'Input Channel', id: 'input', default: 0, choices: makeDropdownChoices('Input Channel', INPUT_CHANNEL_COUNT), minChoicesForSearch: 0 },
				{ type: 'checkbox', label: 'HPF', id: 'hpf', default: true },
			],
			callback: async (action) => {
				const o = action.options as Opts
				companionModule.processCommand({ command: 'set_hpf_on_off', params: { channelNo: o.input, shouldEnable: o.hpf } })
			},
		},
	})
}
