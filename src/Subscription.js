const {
	createAudioPlayer,
	entersState,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
	createAudioResource,
	AudioPlayerStatus,
	VoiceConnection,
	AudioPlayer,
	demuxProbe,
} = require('@discordjs/voice')
const ytdl = require('ytdl-core')

const { promisify } = require('node:util')
const EventEmitter = require('node:events')
const { shuffle } = require('lodash')

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
		 * setTimeout Id when player is idle for 10 mins
		 * @type {NodeJS.Timeout}
		 */
		this._awaitLeave = null
		/**
		 * Now playing
		 * @type {{title: string, url: string}}
		 */
		this._nowPlaying = null

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

				if (this.queue.length) {
					this.play()
				} else {
					this._nowPlaying = null
					this.setTimeout()
					console.log('set timeout')
				}
			}
		})

		this.player.on('error', (error) => console.log(error))

		this.connection.subscribe(this.player)
	}

	/**
	 * Play a song
	 */
	async play() {
		this.playing = true
		// consume
		this._nowPlaying = this.queue[0]
		this.queue.shift()

		let ytStream = ytdl(this._nowPlaying.url, { filter: 'audioonly', highWaterMark: 1 << 25 })
		const { stream, type } = await demuxProbe(ytStream)
		const resource = createAudioResource(stream, { inputType: type })
		try {
			this.player.play(resource)
		} catch (e) {
			console.log('Error', e.message)
		}

		if (this._awaitLeave) {
			clearTimeout(this._awaitLeave)
			this._awaitLeave = null
			console.log('clear timeout')
		}
	}

	/**
	 * Set timeout to destroy subscription instance if player is idle for more than 10 mins
	 */
	setTimeout() {
		this._awaitLeave = setTimeout(() => {
			this.destroy()
		}, 10 * 60 * 1000)
	}

	/**
	 * Add to queue
	 * @param  {{title: string, url: string}[]} args
	 */
	addToQueue(...args) {
		this.queue = this.queue.concat(args)

		if (!this.playing) this.play()
	}

	/**
	 * Stop playing
	 * @returns {true}
	 */
	stop() {
		this.player.stop()
		this.queue = []
		this.playing = false
		this._nowPlaying = null

		this.setTimeout()

		return true
	}

	/**
	 * Skip the current playing song. `true` if skipped.
	 * @returns {Boolean} `true` if skipped, `false` if queue is empty or subscription stopped.
	 */
	skip() {
		if (!this.queue.length || !this.playing) return false

		this.player.stop()

		return true
	}

	/**
	 * Get now playing queue in text
	 * @param {Number} page page
	 * @returns {String} now playing queue
	 */
	getNowPlaying(page) {
		if(!this._nowPlaying) return 'Playlist is empty.'
		const perPage = 10,
			startPagi = perPage * (page - 1),
			endPagi = startPagi + perPage

		let _text = `Now playing: **${this._nowPlaying.title}**\n\n`

		_text += `${this.queue.length} song(s) in queue\n\n`

		for (let i = startPagi; this.queue.length <= perPage ? i < this.queue.length : i < endPagi; i++) {
			const title = this.queue[i].title
			_text += `${i + 1}: **${title}**\n`
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

	/**
	 * Shuffle the queue
	 * @returns {boolean} `true` if playlist is not empty.
	 */
	shuffle() {
		if (!this.queue.length) return false
		this.queue = shuffle(this.queue)

		return true
	}
}

module.exports = Subscription
