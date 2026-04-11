/**
 * Tracks the live state of all dLive channels received via MIDI feedback.
 */
export class DLiveState {
	private muteStates: Map<string, boolean> = new Map()
	private faderLevels: Map<string, number> = new Map()
	private sendStates: Map<string, boolean> = new Map()

	private makeKey(channelType: ChannelType, channelNo: number): string {
		return `${channelType}:${channelNo}`
	}

	private makeSendKey(
		srcType: ChannelType, srcNo: number,
		dstType: ChannelType, dstNo: number,
	): string {
		return `${srcType}:${srcNo}->${dstType}:${dstNo}`
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

	setSendState(
		srcType: ChannelType, srcNo: number,
		dstType: ChannelType, dstNo: number,
		isEnabled: boolean,
	): void {
		this.sendStates.set(this.makeSendKey(srcType, srcNo, dstType, dstNo), isEnabled)
	}

	getSendState(
		srcType: ChannelType, srcNo: number,
		dstType: ChannelType, dstNo: number,
	): boolean {
		return this.sendStates.get(this.makeSendKey(srcType, srcNo, dstType, dstNo)) ?? false
	}

	clear(): void {
		this.muteStates.clear()
		this.faderLevels.clear()
		this.sendStates.clear()
	}
}
