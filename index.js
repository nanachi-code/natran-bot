require('dotenv').config()
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice')
const { Client, Intents } = require('discord.js')
const ytdl = require('ytdl-core')
const ytpl = require('ytpl')
const ytsr = require('ytsr')
// const http = require('http')
// http
// 	.createServer((req, res) => {
// 		res.writeHead(200, {
// 			'Content-type': 'text/plain',
// 		})
// 		res.write('OK')
// 		res.end()
// 	})
// 	.listen(process.env.PORT || 5000)

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] })

client.once('ready', () => {
	console.log('Client ready')
})

let playlist = [],
	playing = false

const player = createAudioPlayer()
player.on('error', (error) => {
	console.error('Error:', error.message)
})
player.on('stateChange', (oldState, newState) => {
	if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
		playlist.shift()
		if (playlist.length) {
			playSong(playlist[0].url)
		} else {
			playing == false
		}
	}
})

function playSong(url) {
	const resource = createAudioResource(ytdl(url, { filter: 'audio', highWaterMark: 1 << 23 }))
	player.play(resource)
}

client.on('interactionCreate', async (interaction) => {
	if (!interaction.isCommand()) return

	switch (interaction.commandName) {
		case 'play':
			const _args = interaction.options.getString('input').trim()
			// is argument empty
			if (!_args.length) {
				await message.reply(`No input arguments.`)

				break
			}

			// check if user is in voice channel
			const channel = interaction.member.voice.channel
			if (!channel) {
				await interaction.reply('Join a voice channel first!')
			}

			// connect
			const connection = joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guild.id,
				adapterCreator: channel.guild.voiceAdapterCreator,
			})

			connection.subscribe(player)

			// is video
			if (ytdl.validateURL(_args)) {
				let title = (await ytdl.getBasicInfo(_args)).videoDetails.title

				playlist.push({ url: _args, title })
				if (!playing) {
					playSong(_args)
					playing = true
				}

				await interaction.reply(`Queued: **${title}**`)
			}
			// is playlist
			else if (ytpl.validateID(_args)) {
				await interaction.deferReply()

				const _pl = await ytpl(_args, { limit: 500 })
				const _items = _pl.items.map((item) => {
					return { url: item.shortUrl, title: item.title }
				})

				playlist = playlist.concat(_items)

				if (!playing) {
					playSong(playlist[0].url)
					playing = true
				}

				await interaction.editReply(`Queued: ${_items.length} song(s)`)
			} 
			// search
			else {
				await interaction.deferReply()

				const _filters = await ytsr.getFilters(_args)
				const _filter = _filters.get('Type').get('Video')
				const _results = await ytsr(_filter.url, { limit: 10 })

				if (_results.items.length) {
					playlist.push({
						url: _results.items[0].url,
						title: _results.items[0].title,
					})

					if (!playing) {
						playSong(playlist[0].url)
						playing = true
					}

					await interaction.editReply(`Queued: **${_results.items[0].title}**`)
				} else {
					await interaction.reply(`No results.`)
				}
			}

			break

		case 'stop':
			if (playlist.length) {
				playlist = []
				player.stop()
			}
			await interaction.reply('Stopped.')

			break

		case 'skip':
			await interaction.reply('Skipped.')
			player.stop()

			break

		case 'np':
			if (!playlist.length) {
				await interaction.reply('Playlist is empty.')
				break
			}

			let _text = `${playlist.length} song(s) in queue\n\n`

			for (let i = 0; playlist.length <= 10 ? i < playlist.length : i < 10; i++) {
				const title = playlist[i].title
				_text += `${i + 1}: **${title}** ${i == 0 ? '(Now playing)' : ''}\n`
			}

			await interaction.reply(_text)

			break
	}
})

// alternative to slash commands
client.on('messageCreate', async (message) => {
	let command = message.content.split(' ')

	if (command[0][0] != '!') return
	commandName = command[0].substring(1)

	switch (commandName) {
		case 'play':
			// check is argument empty
			const _args = message.content.replace('!play', '').trim()
			if (!_args.length) {
				await message.reply(`No input arguments.`)

				break
			}

			// check if user is in voice channel
			const channel = message.member.voice.channel
			if (!channel) {
				await message.reply('Join a voice channel first!')
				break
			}

			// connect
			const connection = joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guild.id,
				adapterCreator: channel.guild.voiceAdapterCreator,
			})

			connection.subscribe(player)

			// is video
			if (ytdl.validateURL(_args)) {
				let title = (await ytdl.getBasicInfo(_args)).videoDetails.title

				playlist.push({ url: _args, title })
				if (!playing) {
					playSong(_args)
					playing = true
				}

				await message.reply(`Queued: **${title}**`)
			}
			// is playlist
			else if (ytpl.validateID(_args)) {
				let _reply = await message.reply(`Fetching...`)

				let _pl = await ytpl(_args, { limit: 500 })

				let items = _pl.items.map((item) => {
					return { url: item.shortUrl, title: item.title }
				})

				playlist = playlist.concat(items)

				if (!playing) {
					playSong(playlist[0].url)
					playing = true
				}

				await _reply.edit(`Queued: ${items.length} song(s)`)
			}
			// search for video
			else {
				let _reply = await message.reply(`Fetching...`)

				const _filters = await ytsr.getFilters(_args)
				const _filter = _filters.get('Type').get('Video')
				const _results = await ytsr(_filter.url, { limit: 10 })

				if (_results.items.length) {
					playlist.push({
						url: _results.items[0].url,
						title: _results.items[0].title,
					})

					if (!playing) {
						playSong(playlist[0].url)
						playing = true
					}

					await _reply.edit(`Queued: **${_results.items[0].title}**`)
				} else {
					await message.reply(`No results.`)
				}
			}
			break

		case 'stop':
			if (playlist.length) {
				playlist = []
				player.stop()
			}
			await message.reply('Stopped.')

			break

		case 'skip':
			await message.reply('Skipped.')
			player.stop()

			break

		case 'np':
			if (!playlist.length) {
				await message.reply('Playlist is empty.')
				break
			}

			let _text = `${playlist.length} song(s) in queue\n\n`

			for (let i = 0; playlist.length <= 10 ? i < playlist.length : i < 10; i++) {
				const title = playlist[i].title
				_text += `${i + 1}: **${title}** ${i == 0 ? '(Now playing)' : ''}\n`
			}

			await message.reply(_text)

			break
	}
})

client.login(process.env.TOKEN)
