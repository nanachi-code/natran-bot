const Command = require('../src/Command')
const { getSubscriptions } = require('../src/utils')

class NowPlaying extends Command {
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

		await message.reply(subscription.getNowPlaying())
	}
}

module.exports = NowPlaying
