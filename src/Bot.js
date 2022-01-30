const { Client, Intents, Collection } = require('discord.js')
const { readdirSync } = require('fs-extra')
const path = require('path')
const Command = require('./Command')

class Bot {
	constructor() {
		/**
		 * Local state
		 * @type {Object}
		 */
		this.local = {}
		/**
		 * CLient instance
		 * @type {Client}
		 */
		this.client = new Client({ intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] })
		/**
		 * Commands
		 * @type {Collection<String,Command>}
		 */
		this.commands = new Collection()

		const commandFiles = readdirSync(path.join(__dirname, `../commands`)).filter((file) => file.endsWith('.js'))

		for (const file of commandFiles) {
			const command = require(path.join(__dirname, `../commands/${file}`))
			this.commands.set(command.name, command)
		}

		this.client.on('messageCreate', async (message) => {
			let _ = message.content.split(' ')

			if (_[0][0] != '!') return

			let commandName = _[0].substring(1)

			let command = this.commands.get(commandName)

			if (!command) return await message.reply('Unknown command.')

			await command.execute(message)
		})
	}

	start() {
		this.client.login(process.env.TOKEN)
	}
}

module.exports = Bot
