import { CompanionVariableDefinition } from '@companion-module/base'

import {
	DCA_COUNT,
	FX_RETURN_COUNT,
	INPUT_CHANNEL_COUNT,
	MAIN_COUNT,
	MONO_AUX_COUNT,
	MONO_FX_SEND_COUNT,
	MONO_GROUP_COUNT,
	MONO_MATRIX_COUNT,
	MUTE_GROUP_COUNT,
	STEREO_AUX_COUNT,
	STEREO_FX_SEND_COUNT,
	STEREO_GROUP_COUNT,
	STEREO_MATRIX_COUNT,
	STEREO_UFX_RETURN_COUNT,
	STEREO_UFX_SEND_COUNT,
} from './constants.js'
import type { ModuleInstance } from './main.js'

interface ChannelVarDef {
	type: ChannelType
	prefix: string
	label: string
	count: number
}

const CHANNEL_VAR_DEFS: ChannelVarDef[] = [
	{ type: 'input', prefix: 'input', label: 'Input', count: INPUT_CHANNEL_COUNT },
	{ type: 'mono_group', prefix: 'mono_grp', label: 'Mono Group', count: MONO_GROUP_COUNT },
	{ type: 'stereo_group', prefix: 'st_grp', label: 'Stereo Group', count: STEREO_GROUP_COUNT },
	{ type: 'mono_aux', prefix: 'mono_aux', label: 'Mono Aux', count: MONO_AUX_COUNT },
	{ type: 'stereo_aux', prefix: 'st_aux', label: 'Stereo Aux', count: STEREO_AUX_COUNT },
	{ type: 'mono_matrix', prefix: 'mono_mtx', label: 'Mono Matrix', count: MONO_MATRIX_COUNT },
	{ type: 'stereo_matrix', prefix: 'st_mtx', label: 'Stereo Matrix', count: STEREO_MATRIX_COUNT },
	{ type: 'mono_fx_send', prefix: 'mono_fxs', label: 'Mono FX Send', count: MONO_FX_SEND_COUNT },
	{ type: 'stereo_fx_send', prefix: 'st_fxs', label: 'Stereo FX Send', count: STEREO_FX_SEND_COUNT },
	{ type: 'fx_return', prefix: 'fxr', label: 'FX Return', count: FX_RETURN_COUNT },
	{ type: 'main', prefix: 'main', label: 'Main', count: MAIN_COUNT },
	{ type: 'dca', prefix: 'dca', label: 'DCA', count: DCA_COUNT },
	{ type: 'mute_group', prefix: 'mutegroup', label: 'Mute Group', count: MUTE_GROUP_COUNT },
	{ type: 'stereo_ufx_send', prefix: 'st_ufxs', label: 'Stereo UFX Send', count: STEREO_UFX_SEND_COUNT },
	{ type: 'stereo_ufx_return', prefix: 'st_ufxr', label: 'Stereo UFX Return', count: STEREO_UFX_RETURN_COUNT },
]

export const UpdateVariableDefinitions = (companionModule: ModuleInstance): void => {
	const defs: CompanionVariableDefinition[] = []

	for (const ch of CHANNEL_VAR_DEFS) {
		for (let i = 0; i < ch.count; i++) {
			// Mute state
			defs.push({
				variableId: `mute_${ch.prefix}_${i + 1}`,
				name: `${ch.label} ${i + 1} Mute`,
			})

			// Fader level (not for mute groups)
			if (ch.type !== 'mute_group') {
				defs.push({
					variableId: `fader_${ch.prefix}_${i + 1}`,
					name: `${ch.label} ${i + 1} Fader Level`,
				})
				defs.push({
					variableId: `fader_db_${ch.prefix}_${i + 1}`,
					name: `${ch.label} ${i + 1} Fader dB`,
				})
			}
		}
	}

	companionModule.setVariableDefinitions(defs)
}

/**
 * Convert MIDI fader value (0-127) to dB string
 */
function midiToDb(value: number): string {
	if (value === 0) return '-INF'
	const db = (value - 107) / 2
	return db.toFixed(1)
}

/**
 * Update all variable values from current state.
 * Called after state changes (mute, fader, send).
 */
export const UpdateVariableValues = (companionModule: ModuleInstance): void => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const values: Record<string, any> = {}

	for (const ch of CHANNEL_VAR_DEFS) {
		for (let i = 0; i < ch.count; i++) {
			const isMuted = companionModule.state.getMuteState(ch.type, i)
			values[`mute_${ch.prefix}_${i + 1}`] = isMuted ? 'MUTED' : 'ON'

			if (ch.type !== 'mute_group') {
				const faderVal = companionModule.state.getFaderLevel(ch.type, i)
				values[`fader_${ch.prefix}_${i + 1}`] = faderVal
				values[`fader_db_${ch.prefix}_${i + 1}`] = midiToDb(faderVal)
			}
		}
	}

	companionModule.setVariableValues(values)
}
