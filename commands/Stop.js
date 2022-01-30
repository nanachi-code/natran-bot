const Command = require('../src/Command')
const { getSubscriptions } = require('../src/utils')

class Stop extends Command {
	/**
	 * @param {Object} local Local state reference.
	 * @constructor
	 */
	constructor(local) {
		super('stop', local)
	}

	/**
	 * Execute the command.
	 * @param {Message} message Discord message
	 */
	async execute(message) {
		const subscriptions = getSubscriptions(this.local)
		let subscription = subscriptions.get(message.guildId)

		subscription.stop()
		await message.reply('Stopped.')
	}
}

module.exports = new Stop()
