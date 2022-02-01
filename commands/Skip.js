const Command = require('../src/Command')
const { ensureSubscription } = require('../src/utils')

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
		const subscription = ensureSubscription(this.local, message)
		if (!subscription) return await message.reply('Join a voice channel first!')

		if (subscription.skip()) {
			await message.reply('Skipped.')
		} else {
			await message.reply('Queue is empty.')
		}
	}
}

module.exports = Skip
