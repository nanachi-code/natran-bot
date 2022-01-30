const {
	createAudioPlayer,
	entersState,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
	createAudioResource,
	AudioPlayerStatus,
	VoiceConnection,
	AudioPlayer,
} = require('@discordjs/voice')
const ytdl = require('ytdl-core')

const { promisify } = require('node:util')
const EventEmitter = require('node:events')
const { truncateSync } = require('node:fs')

const wait = promisify(setTimeout)

class Subscription extends EventEmitter {
	/**
	 * @constructor
	 * @param {String} id Id
	 * @param {VoiceConnection} connection Voice connection instance
	 */
	constructor(id, connection) {
		super()
		/**
		 * Id
		 * @type {String}
		 */
		this.id = id
		/**
		 * Playlist queue
		 * @type {{title: string, url: string}[]}
		 */
		this.queue = []
		/**
		 * Voice connection instance
		 * @type {VoiceConnection}
		 */
		this.connection = connection
		/**
		 * Player instance
		 * @type {AudioPlayer}
		 */
		this.player = createAudioPlayer()
		/**
		 * Is playing
		 * @type {Boolean}
		 */
		this.playing = false
		/**
		 * Is ready
		 * @type {Boolean}
		 */
		this.readyLock = false
		/**
		 * setTimeout Id when player is idle for 3 mins
		 * @type {NodeJS.Timeout}
		 */
		this._awaitLeave = null

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
						this.emit('kicked')
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
				this.playing = false
				this.queue.shift()

				if (this.queue.length) {
					this.play(this.queue[0].url)
				} else {
					this.setTimeout()
				}
			}
		})

		this.player.on('error', (error) => console.log(error))

		this.connection.subscribe(this.player)
	}

	/**
	 * Play a song
	 * @param {String} url Youtube url
	 * @returns {Subscription}
	 */
	play(url) {
		this.playing = false
		const resource = createAudioResource(ytdl(url, { filter: 'audio', highWaterMark: 1 << 23 }))
		this.player.play(resource)

		if (this._awaitLeave) {
			clearTimeout(this._awaitLeave)
		}

		return this
	}

	/**
	 * Set timeout to destroy subscription instance if player is idle for more than 3 mins
	 */
	setTimeout() {
		this._awaitLeave = setTimeout(() => {
			this.destroy()
		}, 3 * 60 * 1000)
	}

	/**
	 * Add to queue
	 * @param  {{title: string, url: string}[]} args
	 */
	addToQueue(...args) {
		this.queue = this.queue.concat(args)

		if (!this.playing) this.play(this.queue[0].url)
	}

	/**
	 * Stop playing
	 */
	stop() {
		this.player.stop()
		this.queue = []
		this.playing = false

		this.setTimeout()
	}

	/**
	 * Skip the current playing song
	 */
	skip() {
		this.player.stop()
	}

	/**
	 * Get now playing queue in text
	 * @returns {String}
	 */
	getNowPlaying() {
		if (!this.queue.length) return 'Playlist is empty.'

		let _text = `${this.queue.length} song(s) in queue\n\n`

		for (let i = 0; this.queue.length <= 10 ? i < this.queue.length : i < 10; i++) {
			const title = this.queue[i].title
			_text += `${i + 1}: **${title}** ${i == 0 ? '(Now playing)' : ''}\n`
		}

		return _text
	}

	/**
	 * Destroy this instance
	 */
	destroy() {
		this.connection.destroy()
		this.emit('destroyed')
	}
}

module.exports = Subscription