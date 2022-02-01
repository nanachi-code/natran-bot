const Command = require('../src/Command')
const { ensureSubscription } = require('../src/utils')

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
		const subscription = ensureSubscription(this.local, message)

		subscription.stop()
		await message.reply('Stopped.')
	}
}

module.exports = Stop
