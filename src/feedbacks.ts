import { combineRgb, CompanionFeedbackDefinitions } from '@companion-module/base'
import { camelCase } from 'lodash/fp'

import { CHANNEL_TYPE_CHOICES, FADER_LEVEL_CHOICES } from './constants.js'
import type { ModuleInstance } from './main.js'
import { makeDropdownChoices } from './utils/index.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Opts = Record<string, any>

export const UpdateFeedbacks = (companionModule: ModuleInstance): void => {
	const feedbacks: CompanionFeedbackDefinitions = {
		channelMute: {
			type: 'boolean',
			name: 'Channel Mute Status',
			description:
				'Changes button style when a channel is muted. Works for all channel types: Input, Group, Aux, Matrix, FX, Main, DCA, Mute Group, etc.',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Channel Type',
					id: 'channelType',
					default: CHANNEL_TYPE_CHOICES[0].id,
					choices: CHANNEL_TYPE_CHOICES,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown', label: 'Input Channel', id: 'input', default: 0,
					choices: makeDropdownChoices('Input Channel', 128), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "input"`,
				},
				{
					type: 'dropdown', label: 'Mono Group', id: 'monoGroup', default: 0,
					choices: makeDropdownChoices('Mono Group', 62), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "mono_group"`,
				},
				{
					type: 'dropdown', label: 'Stereo Group', id: 'stereoGroup', default: 0,
					choices: makeDropdownChoices('Stereo Group', 31), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_group"`,
				},
				{
					type: 'dropdown', label: 'Mono Aux', id: 'monoAux', default: 0,
					choices: makeDropdownChoices('Mono Aux', 62), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "mono_aux"`,
				},
				{
					type: 'dropdown', label: 'Stereo Aux', id: 'stereoAux', default: 0,
					choices: makeDropdownChoices('Stereo Aux', 32), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_aux"`,
				},
				{
					type: 'dropdown', label: 'Mono Matrix', id: 'monoMatrix', default: 0,
					choices: makeDropdownChoices('Mono Matrix', 62), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "mono_matrix"`,
				},
				{
					type: 'dropdown', label: 'Stereo Matrix', id: 'stereoMatrix', default: 0,
					choices: makeDropdownChoices('Stereo Matrix', 31), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_matrix"`,
				},
				{
					type: 'dropdown', label: 'Mono FX Send', id: 'monoFxSend', default: 0,
					choices: makeDropdownChoices('Mono FX Send', 16), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "mono_fx_send"`,
				},
				{
					type: 'dropdown', label: 'Stereo FX Send', id: 'stereoFxSend', default: 0,
					choices: makeDropdownChoices('Stereo FX Send', 16), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_fx_send"`,
				},
				{
					type: 'dropdown', label: 'FX Return', id: 'fxReturn', default: 0,
					choices: makeDropdownChoices('FX Return', 16), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "fx_return"`,
				},
				{
					type: 'dropdown', label: 'Main', id: 'main', default: 0,
					choices: makeDropdownChoices('Main', 6), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "main"`,
				},
				{
					type: 'dropdown', label: 'DCA', id: 'dca', default: 0,
					choices: makeDropdownChoices('DCA', 24), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "dca"`,
				},
				{
					type: 'dropdown', label: 'Mute Group', id: 'muteGroup', default: 0,
					choices: makeDropdownChoices('Mute Group', 8), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "mute_group"`,
				},
				{
					type: 'dropdown', label: 'Stereo UFX Send', id: 'stereoUfxSend', default: 0,
					choices: makeDropdownChoices('Stereo UFX Send', 8), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_ufx_send"`,
				},
				{
					type: 'dropdown', label: 'Stereo UFX Return', id: 'stereoUfxReturn', default: 0,
					choices: makeDropdownChoices('Stereo UFX Return', 8), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_ufx_return"`,
				},
			],
			callback: (feedback) => {
				const o = feedback.options as Opts
				const channelType = o.channelType as ChannelType
				if (!channelType) return false
				const channelNo = o[camelCase(channelType)] as number
				if (channelNo === undefined) return false
				return companionModule.state.getMuteState(channelType, channelNo)
			},
		},

		faderLevel: {
			type: 'boolean',
			name: 'Fader Level Threshold',
			description:
				'Changes button style when a fader level is at or above a threshold. Useful for showing when a channel is "up".',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Channel Type',
					id: 'channelType',
					default: CHANNEL_TYPE_CHOICES[0].id,
					choices: CHANNEL_TYPE_CHOICES.filter((c) => c.id !== 'mute_group'),
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown', label: 'Input Channel', id: 'input', default: 0,
					choices: makeDropdownChoices('Input Channel', 128), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "input"`,
				},
				{
					type: 'dropdown', label: 'DCA', id: 'dca', default: 0,
					choices: makeDropdownChoices('DCA', 24), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "dca"`,
				},
				{
					type: 'dropdown', label: 'Main', id: 'main', default: 0,
					choices: makeDropdownChoices('Main', 6), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "main"`,
				},
				{
					type: 'dropdown', label: 'Mono Group', id: 'monoGroup', default: 0,
					choices: makeDropdownChoices('Mono Group', 62), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "mono_group"`,
				},
				{
					type: 'dropdown', label: 'Stereo Group', id: 'stereoGroup', default: 0,
					choices: makeDropdownChoices('Stereo Group', 31), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_group"`,
				},
				{
					type: 'dropdown', label: 'Mono Aux', id: 'monoAux', default: 0,
					choices: makeDropdownChoices('Mono Aux', 62), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "mono_aux"`,
				},
				{
					type: 'dropdown', label: 'Stereo Aux', id: 'stereoAux', default: 0,
					choices: makeDropdownChoices('Stereo Aux', 32), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_aux"`,
				},
				{
					type: 'dropdown', label: 'Mono Matrix', id: 'monoMatrix', default: 0,
					choices: makeDropdownChoices('Mono Matrix', 62), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "mono_matrix"`,
				},
				{
					type: 'dropdown', label: 'Stereo Matrix', id: 'stereoMatrix', default: 0,
					choices: makeDropdownChoices('Stereo Matrix', 31), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_matrix"`,
				},
				{
					type: 'dropdown', label: 'Mono FX Send', id: 'monoFxSend', default: 0,
					choices: makeDropdownChoices('Mono FX Send', 16), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "mono_fx_send"`,
				},
				{
					type: 'dropdown', label: 'Stereo FX Send', id: 'stereoFxSend', default: 0,
					choices: makeDropdownChoices('Stereo FX Send', 16), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_fx_send"`,
				},
				{
					type: 'dropdown', label: 'FX Return', id: 'fxReturn', default: 0,
					choices: makeDropdownChoices('FX Return', 16), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "fx_return"`,
				},
				{
					type: 'dropdown', label: 'Stereo UFX Send', id: 'stereoUfxSend', default: 0,
					choices: makeDropdownChoices('Stereo UFX Send', 8), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_ufx_send"`,
				},
				{
					type: 'dropdown', label: 'Stereo UFX Return', id: 'stereoUfxReturn', default: 0,
					choices: makeDropdownChoices('Stereo UFX Return', 8), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_ufx_return"`,
				},
				{
					type: 'dropdown',
					label: 'Threshold',
					id: 'threshold',
					default: 1,
					choices: FADER_LEVEL_CHOICES,
					minChoicesForSearch: 0,
				},
			],
			callback: (feedback) => {
				const o = feedback.options as Opts
				const channelType = o.channelType as ChannelType
				if (!channelType) return false
				const channelNo = o[camelCase(channelType)] as number
				if (channelNo === undefined) return false
				const threshold = o.threshold as number
				const currentLevel = companionModule.state.getFaderLevel(channelType, channelNo)
				return currentLevel >= threshold
			},
		},

		muteGroupActive: {
			type: 'boolean',
			name: 'Mute Group Active',
			description: 'Changes button style when a specific Mute Group is muted/active.',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Mute Group',
					id: 'muteGroup',
					default: 0,
					choices: makeDropdownChoices('Mute Group', 8),
					minChoicesForSearch: 0,
				},
			],
			callback: (feedback) => {
				const o = feedback.options as Opts
				return companionModule.state.getMuteState('mute_group', o.muteGroup as number)
			},
		},

		dcaMute: {
			type: 'boolean',
			name: 'DCA Mute Status',
			description: 'Changes button style when a specific DCA is muted.',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'dropdown',
					label: 'DCA',
					id: 'dca',
					default: 0,
					choices: makeDropdownChoices('DCA', 24),
					minChoicesForSearch: 0,
				},
			],
			callback: (feedback) => {
				const o = feedback.options as Opts
				return companionModule.state.getMuteState('dca', o.dca as number)
			},
		},

		inputMute: {
			type: 'boolean',
			name: 'Input Channel Mute',
			description: 'Changes button style when a specific Input channel is muted.',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'input',
					default: 0,
					choices: makeDropdownChoices('Input Channel', 128),
					minChoicesForSearch: 0,
				},
			],
			callback: (feedback) => {
				const o = feedback.options as Opts
				return companionModule.state.getMuteState('input', o.input as number)
			},
		},
		channelSendActive: {
			type: 'boolean',
			name: 'Channel Send On/Off Status',
			description: 'Changes button style when a specific send from a source channel to a destination (Aux, FX, Matrix, Group) is enabled.',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				// Source channel type
				{
					type: 'dropdown', label: 'Source Channel Type', id: 'channelType',
					default: 'input',
					choices: CHANNEL_TYPE_CHOICES.filter((c) =>
						['input', 'mono_group', 'stereo_group', 'fx_return', 'stereo_ufx_return'].includes(c.id),
					),
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown', label: 'Input Channel', id: 'input', default: 0,
					choices: makeDropdownChoices('Input Channel', 128), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "input"`,
				},
				{
					type: 'dropdown', label: 'Mono Group', id: 'monoGroup', default: 0,
					choices: makeDropdownChoices('Mono Group', 62), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "mono_group"`,
				},
				{
					type: 'dropdown', label: 'Stereo Group', id: 'stereoGroup', default: 0,
					choices: makeDropdownChoices('Stereo Group', 31), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_group"`,
				},
				{
					type: 'dropdown', label: 'FX Return', id: 'fxReturn', default: 0,
					choices: makeDropdownChoices('FX Return', 16), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "fx_return"`,
				},
				{
					type: 'dropdown', label: 'Stereo UFX Return', id: 'stereoUfxReturn', default: 0,
					choices: makeDropdownChoices('Stereo UFX Return', 8), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:channelType) == "stereo_ufx_return"`,
				},
				// Destination channel type
				{
					type: 'dropdown', label: 'Destination Channel Type', id: 'destinationChannelType',
					default: 'mono_aux',
					choices: CHANNEL_TYPE_CHOICES.filter((c) =>
						['mono_group', 'stereo_group', 'mono_aux', 'stereo_aux', 'mono_fx_send', 'stereo_fx_send', 'mono_matrix', 'stereo_matrix', 'stereo_ufx_send'].includes(c.id),
					),
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown', label: 'Dest Mono Group', id: 'destinationMonoGroup', default: 0,
					choices: makeDropdownChoices('Mono Group', 62), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:destinationChannelType) == "mono_group"`,
				},
				{
					type: 'dropdown', label: 'Dest Stereo Group', id: 'destinationStereoGroup', default: 0,
					choices: makeDropdownChoices('Stereo Group', 31), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:destinationChannelType) == "stereo_group"`,
				},
				{
					type: 'dropdown', label: 'Dest Mono Aux', id: 'destinationMonoAux', default: 0,
					choices: makeDropdownChoices('Mono Aux', 62), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:destinationChannelType) == "mono_aux"`,
				},
				{
					type: 'dropdown', label: 'Dest Stereo Aux', id: 'destinationStereoAux', default: 0,
					choices: makeDropdownChoices('Stereo Aux', 32), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:destinationChannelType) == "stereo_aux"`,
				},
				{
					type: 'dropdown', label: 'Dest Mono FX Send', id: 'destinationMonoFxSend', default: 0,
					choices: makeDropdownChoices('Mono FX Send', 16), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:destinationChannelType) == "mono_fx_send"`,
				},
				{
					type: 'dropdown', label: 'Dest Stereo FX Send', id: 'destinationStereoFxSend', default: 0,
					choices: makeDropdownChoices('Stereo FX Send', 16), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:destinationChannelType) == "stereo_fx_send"`,
				},
				{
					type: 'dropdown', label: 'Dest Mono Matrix', id: 'destinationMonoMatrix', default: 0,
					choices: makeDropdownChoices('Mono Matrix', 62), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:destinationChannelType) == "mono_matrix"`,
				},
				{
					type: 'dropdown', label: 'Dest Stereo Matrix', id: 'destinationStereoMatrix', default: 0,
					choices: makeDropdownChoices('Stereo Matrix', 31), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:destinationChannelType) == "stereo_matrix"`,
				},
				{
					type: 'dropdown', label: 'Dest Stereo UFX Send', id: 'destinationStereoUfxSend', default: 0,
					choices: makeDropdownChoices('Stereo UFX Send', 8), minChoicesForSearch: 0,
					isVisibleExpression: `$(options:destinationChannelType) == "stereo_ufx_send"`,
				},
			],
			callback: (feedback) => {
				try {
					const o = feedback.options as Opts
					const srcType = o.channelType as ChannelType
					if (!srcType) return false
					const srcNo = o[camelCase(srcType)] as number
					const dstType = o.destinationChannelType as ChannelType
					if (!dstType) return false
					const dstNo = o[camelCase(`destination_${dstType}`)] as number
					if (srcNo === undefined || dstNo === undefined) return false
					return companionModule.state.getSendState(srcType, srcNo, dstType, dstNo)
				} catch {
					return false
				}
			},
		},
	}

	companionModule.setFeedbackDefinitions(feedbacks)
}
