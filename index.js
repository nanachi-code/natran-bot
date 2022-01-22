require('dotenv').config()
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice')
const { Client, Intents } = require('discord.js')
const ytdl = require('ytdl-core')
const ytpl = require('ytpl')

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
	const resource = createAudioResource(ytdl(url, { filter: 'audio' }))
	player.play(resource)
}

client.on('interactionCreate', async (interaction) => {
	if (!interaction.isCommand()) return

	switch (interaction.commandName) {
		case 'play':
			const channel = interaction.member.voice.channel
			if (channel) {
				const connection = joinVoiceChannel({
					channelId: channel.id,
					guildId: channel.guild.id,
					adapterCreator: channel.guild.voiceAdapterCreator,
				})

				connection.subscribe(player)

				const url = interaction.options.getString('url')

				if (ytdl.validateURL(url)) {
					let title = (await ytdl.getBasicInfo(url)).videoDetails.title

					playlist.push({ url, title })
					if (!playing) {
						playSong(url)
						playing = true
					}

					await interaction.reply(`Queued: ${url}`)
				} else if (ytpl.validateID(url)) {
					await interaction.deferReply()
					let _pl = await ytpl(url, { limit: 500 })

					let items = _pl.items.map((item) => {
						return { url: item.shortUrl, title: item.title }
					})

					playlist = playlist.concat(items)

					if (!playing) {
						playSong(playlist[0].url)
						playing = true
					}

					await interaction.editReply(`Queued: ${items.length} song(s)`)
				} else {
					await interaction.reply(`Invalid YouTube url.`)
				}
			} else {
				await interaction.reply('Join a voice channel first!')
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

		case 'playing':
			if (!playlist.length) {
				await interaction.reply('Playlist is empty.')
				break
			}

			let _text = ''

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
	console.log(command)
	if (command[0][0] != '!') return
	commandName = command[0].substring(1)

	switch (commandName) {
		case 'play':
			const channel = message.member.voice.channel
			if (channel) {
				const connection = joinVoiceChannel({
					channelId: channel.id,
					guildId: channel.guild.id,
					adapterCreator: channel.guild.voiceAdapterCreator,
				})

				connection.subscribe(player)

				const url = command[1]

				if (ytdl.validateURL(url)) {
					let title = (await ytdl.getBasicInfo(url)).videoDetails.title

					playlist.push({ url, title })
					if (!playing) {
						playSong(url)
						playing = true
					}

					await message.reply(`Queued: ${url}`)
				} else if (ytpl.validateID(url)) {
					let _reply = await message.reply(`Fetching...`)

					let _pl = await ytpl(url, { limit: 500 })

					let items = _pl.items.map((item) => {
						return { url: item.shortUrl, title: item.title }
					})

					playlist = playlist.concat(items)

					if (!playing) {
						playSong(playlist[0].url)
						playing = true
					}

					await _reply.edit(`Queued: ${items.length} song(s)`)
				} else {
					await message.reply(`Invalid YouTube url.`)
				}
			} else {
				await message.reply('Join a voice channel first!')
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

		case 'playing':
			if (!playlist.length) {
				await message.reply('Playlist is empty.')
				break
			}

			let _text = ''

			for (let i = 0; playlist.length <= 10 ? i < playlist.length : i < 10; i++) {
				const title = playlist[i].title
				_text += `${i + 1}: **${title}** ${i == 0 ? '(Now playing)' : ''}\n`
			}

			await message.reply(_text)

			break
	}
})

client.login(process.env.TOKEN)
