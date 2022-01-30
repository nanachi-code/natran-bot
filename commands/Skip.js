const Command = require('../src/Command')
const { getSubscriptions } = require('../src/utils')

class Skip extends Command {
	/**
	 * @param {Object} local Local state reference.
	 * @constructor
	 */
	constructor(local) {
		super('skip', local)
	}

	/**
	 * Execute the command.
	 * @param {Message} message Discord message
	 */
	async execute(message) {
		const subscriptions = getSubscriptions(this.local)
		let subscription = subscriptions.get(message.guildId)

		subscription.skip()
		await message.reply('Skipped.')
	}
}

module.exports = Skip
