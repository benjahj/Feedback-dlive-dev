import { DropdownChoice } from '@companion-module/base'
import { compact, times } from 'lodash/fp'

const DEFAULT_OPTIONS = { labelOffset: 0 }

interface MakeDropdownChoicesOptions {
	labelOffset?: number
}

export const makeDropdownChoices = (
	labelPrefix: string,
	labelCount: number,
	options?: MakeDropdownChoicesOptions,
): DropdownChoice[] => {
	const { labelOffset } = { ...DEFAULT_OPTIONS, ...options }
	return compact(times((id: number) => ({ label: `${labelPrefix} ${id + 1 + labelOffset}`, id }))(labelCount))
}
