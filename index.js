require('dotenv').config()
const { joinVoiceChannel } = require('@discordjs/voice')
const { Client, Intents } = require('discord.js')
const ytdl = require('ytdl-core')
const ytpl = require('ytpl')
const ytsr = require('ytsr')
const Subscription = require('./subscription')

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] })

client.once('ready', () => {
	console.log('Client ready')
})

const subscriptions = new Map()

client.on('messageCreate', async (message) => {
	let command = message.content.split(' ')

	if (command[0][0] != '!') return
	let commandName = command[0].substring(1)

	let subscription = subscriptions.get(message.guildId)
	const channel = message.member.voice.channel
	// check if user is in voice channel
	if (['play', 'skip', 'stop', 'np'].includes(commandName)) {
		if (!channel) return await message.reply('Join a voice channel first!')

		if (!subscription) {
			// connect
			const connection = joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guildId,
				adapterCreator: channel.guild.voiceAdapterCreator,
			})

			subscription = new Subscription(connection)
			subscription.on('kicked', () => {
				console.log('Bot kicked');
				subscriptions.delete(channel.guildId)
			})

			subscription.on('destroyed', () => {
				console.log('Connection destroyed');
				subscriptions.delete(channel.guildId)
			})
			subscriptions.set(channel.guildId, subscription)
		}
	}

	if (commandName === 'play') {
		// check is argument empty
		const _args = message.content.replace('!play', '').trim()
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
	// stop
	else if (commandName === 'stop') {
		subscription.stop()
		await message.reply('Stopped.')
	}
	// skip
	else if (commandName === 'skip') {
		subscription.skip()
		await message.reply('Skipped.')
	}
	// now playing
	else if (commandName === 'np') {
		await message.reply(subscription.getNowPlaying())
	}
	// leave
	else if (commandName === 'leave') {
		subscription.destroy()
		subscriptions.delete(channel.guildId)

		await message.reply('Left channel.')
	}
	// handle unknown
	else {
		await message.reply('Unknown command.')
	}
})

client.login(process.env.TOKEN)
