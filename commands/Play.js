const { joinVoiceChannel } = require('@discordjs/voice')
const ytdl = require('ytdl-core')
const ytpl = require('ytpl')
const ytsr = require('ytsr')
const Command = require('../src/Command')
const Subscription = require('../src/subscription')
const { getSubscriptions } = require('../src/utils')

class Play extends Command {
	/**
	 * @param {Object} local Local state reference.
	 * @constructor
	 */
	constructor(local) {
		super('play', local)
	}

	/**
	 * Execute the command.
	 * @param {Message} message Discord message
	 */
	async execute(message) {
		const channel = message.member.voice.channel
		if (!channel) return await message.reply('Join a voice channel first!')

		const subscriptions = getSubscriptions(this.local)
		let subscription = subscriptions.get(message.guildId)

		if (!subscription) {
			// connect
			const connection = joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guildId,
				adapterCreator: channel.guild.voiceAdapterCreator,
			})

			subscription = new Subscription(connection)

			subscription.on('kicked', () => {
				console.log('Bot kicked')
				subscriptions.delete(channel.guildId)
			})

			subscription.on('destroyed', () => {
				console.log('Connection destroyed')
				subscriptions.delete(channel.guildId)
			})
			subscriptions.set(channel.guildId, subscription)
		}

        // check is argument empty
		const _args = this.getArgument(message)
		if (!_args.length) return await message.reply(`No input arguments.`)

		// is video
		if (ytdl.validateURL(_args)) {
			let _reply = await message.reply(`Fetching...`)

			let title = (await ytdl.getBasicInfo(_args)).videoDetails.title

			subscription.addToQueue({ url: _args, title })

			await _reply.edit(`Queued: **${title}**`)
		}
		// is playlist
		else if (ytpl.validateID(_args)) {
			let _reply = await message.reply(`Fetching...`)

			let _pl = await ytpl(_args, { limit: 500 })

			let items = _pl.items.map((item) => {
				return { url: item.shortUrl, title: item.title }
			})

			subscription.addToQueue(items)

			await _reply.edit(`Queued: ${items.length} song(s)`)
		}
		// search for video
		else {
			let _reply = await message.reply(`Fetching...`)

			const _filters = await ytsr.getFilters(_args)
			const _filter = _filters.get('Type').get('Video')
			const _results = await ytsr(_filter.url, { limit: 10 })

			if (_results.items.length) {
				let item = {
					url: _results.items[0].url,
					title: _results.items[0].title,
				}

				subscription.addToQueue(item)

				await _reply.edit(`Queued: **${_results.items[0].title}**`)
			} else {
				await message.reply(`No results.`)
			}
		}
	}
}

module.exports = new Play()
