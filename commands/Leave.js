const Command = require('../src/Command')
const { getSubscriptions } = require('../src/utils')

class Leave extends Command {
	/**
	 * @param {Object} local Local state reference.
	 * @constructor
	 */
	constructor(local) {
		super('np', local)
	}

	/**
	 * Execute the command.
	 * @param {Message} message Discord message
	 */
	async execute(message) {
		const subscriptions = getSubscriptions(this.local)
		let subscription = subscriptions.get(message.guildId)
		const channel = message.member.voice.channel

		subscription.destroy()
		subscriptions.delete(channel.guildId)

		await message.reply('Left channel.')
	}
}

module.exports = new Leave()
