const { joinVoiceChannel } = require('@discordjs/voice')
const { Message } = require('discord.js')
const ytdl = require('ytdl-core')
const ytpl = require('ytpl')
const ytsr = require('ytsr')
const Command = require('../src/Command')
const Subscription = require('../src/Subscription')
const { ensureSubscriptions: getSubscriptions, ensureSubscription } = require('../src/utils')

class Play extends Command {
	/**
	 * @param {Object} local Local state reference.
	 * @constructor
	 */
	constructor(local) {
		super('play', local, ['p'])
	}

	/**
	 * Execute the command.
	 * @param {Message} message Discord message
	 */
	async execute(message) {
		const subscription = ensureSubscription(this.local, message)

		if (!subscription) return await message.reply('Join a voice channel first!')

		// check is argument empty
		const _args = this.getArgument(message)
		if (!_args) return await message.reply(`No input arguments.`)

		let _reply = await message.reply(`Fetching...`)

		// is video
		if (ytdl.validateURL(_args)) {
			let title = (await ytdl.getBasicInfo(_args)).videoDetails.title

			subscription.addToQueue({ url: _args, title })

			await _reply.edit(`Queued: **${title}**`)
		}
		// is playlist
		else if (ytpl.validateID(_args)) {
			let _pl = await ytpl(_args, { limit: 500 })

			_pl.items.forEach((item) => {
				subscription.addToQueue({ url: item.shortUrl, title: item.title })
			})

			await _reply.edit(`Queued: ${_pl.items.length} song(s)`)
		}
		// search for video
		else {
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

module.exports = Play
