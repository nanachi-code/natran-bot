const { Message } = require('discord.js')
const Command = require('../src/Command')
const { ensureSubscriptions, ensureSubscription } = require('../src/utils')

class Leave extends Command {
	/**
	 * @param {Object} local Local state reference.
	 * @constructor
	 */
	constructor(local) {
		super('leave', local)
	}

	/**
	 * Execute the command.
	 * @param {Message} message Discord message
	 */
	async execute(message) {
		let id = message.guildId
		const subscriptions = ensureSubscriptions(this.local)
		const subscription = subscriptions.get(id)

		if (subscription) {
			subscription.destroy()
			subscriptions.delete(id)
		}

		await message.reply('Bot was kicked.')
	}
}

module.exports = Leave
