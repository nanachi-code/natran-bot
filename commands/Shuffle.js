const Command = require('../src/Command.js')
const { ensureSubscription } = require('../src/utils.js')

module.exports = class Shuffle extends Command {
	constructor(local) {
		super('shuffle', local)
	}

	/**
	 * Execute the command.
	 * @param {Message} message Discord message
	 */
	async execute(message) {
		const subscription = ensureSubscription(this.local, message)
		if (!subscription) return await message.reply('Join a voice channel first!')

		if (subscription.shuffle()) {
			await message.reply('Shuffled.')
		} else {
			await message.reply('Playlist is empty.')
		}
	}
}
