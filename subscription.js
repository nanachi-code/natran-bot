const { createAudioPlayer, entersState, VoiceConnectionDisconnectReason, VoiceConnectionStatus, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice')
const ytdl = require('ytdl-core')

class Subscription {
	constructor(connection) {
		this.queue = []
		this.connection = connection
		this.player = createAudioPlayer()
		this.playing = false

		this.connection.on('stateChange', async (_, newState) => {
			if (newState.status === VoiceConnectionStatus.Disconnected) {
				if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
					/**
					 * If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
					 * but there is a chance the connection will recover itself if the reason of the disconnect was due to
					 * switching voice channels. This is also the same code for the bot being kicked from the voice channel,
					 * so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
					 * the voice connection.
					 */
					try {
						await entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000)
						// Probably moved voice channel
					} catch {
						this.connection.destroy()
						// Probably removed from voice channel
					}
				} else if (this.connection.rejoinAttempts < 5) {
					/**
					 * The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
					 */
					await wait((this.connection.rejoinAttempts + 1) * 5_000)
					this.connection.rejoin()
				} else {
					/**
					 * The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
					 */
					this.connection.destroy()
				}
			} else if (newState.status === VoiceConnectionStatus.Destroyed) {
				/**
				 * Once destroyed, stop the subscription.
				 */
				this.stop()
			} else if (!this.readyLock && (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)) {
				/**
				 * In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
				 * before destroying the voice connection. This stops the voice connection permanently existing in one of these
				 * states.
				 */
				this.readyLock = true
				try {
					await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000)
				} catch {
					if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) this.connection.destroy()
				} finally {
					this.readyLock = false
				}
			}
		})

		this.player.on('stateChange', (oldState, newState) => {
			if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
				this.playlist.shift()
				if (this.playlist.length) {
					this.play()
				} else {
					this.playing == false
				}
			}
		})

		this.player.on('error', (error) => error.resource.metadata.onError(error))

		this.connection.subscribe(this.player)
	}

	playSong(url) {
		const resource = createAudioResource(ytdl(url, { filter: 'audio', highWaterMark: 1 << 23 }))
		this.player.play(resource)
		return this
	}

	addToQueue(...args) {
		this.queue = this.queue.concat(args)
		return this
	}

	play() {
		if (!this.playing && this.queue.length) {
			console.log('play')
			this.playSong(this.queue[0].url)
			this.playing = true
		}

		return this
	}

	stop() {
		this.player.stop()
		this.queue = []
		this.playing = false

		return this
	}

	skip() {
		this.player.stop()

		return this
	}

	getNowPlaying() {
		if (!this.queue.length) return 'Playlist is empty.'

		let _text = `${playlist.length} song(s) in queue\n\n`

		for (let i = 0; playlist.length <= 10 ? i < playlist.length : i < 10; i++) {
			const title = playlist[i].title
			_text += `${i + 1}: **${title}** ${i == 0 ? '(Now playing)' : ''}\n`
		}

		return _text
	}

	destroy() {
		this.connection.destroy()
	}
}

module.exports = Subscription
