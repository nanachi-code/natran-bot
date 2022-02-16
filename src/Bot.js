const { Client, Intents, Collection } = require('discord.js')
const { readdirSync } = require('fs-extra')
const { join } = require('path')
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
		this.client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] })
		/**
		 * Commands
		 * @type {Collection<String,Command>}
		 */
		this.commands = new Collection()

		const commandFiles = readdirSync(join(__dirname, `../commands`)).filter((file) => file.endsWith('.js'))

		for (const file of commandFiles) {
			const ImportedCommand = require(join(__dirname, `../commands/${file}`))
			/**
			 * @type {Command}
			 */
			const command = new ImportedCommand(this.local)
			this.commands.set(command.name, command)
			if (command.alias.length) {
				command.alias.forEach((alias) => {
					if (this.commands.has(alias)) throw new Error(`Command name ${alias} existed.`)
					this.commands.set(alias, command)
				})
			}
		}

		this.client.on('messageCreate', async (message) => {
			let _ = message.content.split(' ')

			if (_[0][0] != '!') return

			let commandName = _[0].substring(1)

			let command = this.commands.get(commandName)

			if (!command) return await message.reply('Unknown command.')

			await command.execute(message)
		})

		this.client.once('ready', () => {
			console.log('Client ready')
		})
	}

	start() {
		this.client.login(process.env.TOKEN)
	}
}

module.exports = Bot
