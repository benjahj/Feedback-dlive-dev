/**
 * Tracks the live state of all dLive channels received via MIDI feedback.
 */
export class DLiveState {
	private muteStates: Map<string, boolean> = new Map()
	private faderLevels: Map<string, number> = new Map()

	private makeKey(channelType: ChannelType, channelNo: number): string {
		return `${channelType}:${channelNo}`
	}

	setMuteState(channelType: ChannelType, channelNo: number, isMuted: boolean): void {
		this.muteStates.set(this.makeKey(channelType, channelNo), isMuted)
	}

	getMuteState(channelType: ChannelType, channelNo: number): boolean {
		return this.muteStates.get(this.makeKey(channelType, channelNo)) ?? false
	}

	setFaderLevel(channelType: ChannelType, channelNo: number, level: number): void {
		this.faderLevels.set(this.makeKey(channelType, channelNo), level)
	}

	getFaderLevel(channelType: ChannelType, channelNo: number): number {
		return this.faderLevels.get(this.makeKey(channelType, channelNo)) ?? 0
	}

	clear(): void {
		this.muteStates.clear()
		this.faderLevels.clear()
	}
}
