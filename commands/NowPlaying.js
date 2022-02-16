const Command = require('../src/Command')
const { ensureSubscription } = require('../src/utils')

class NowPlaying extends Command {
	/**
	 * @param {Object} local Local state reference.
	 * @constructor
	 */
	constructor(local) {
		super('np', local, ['queue', 'q'])
	}

	/**
	 * Execute the command.
	 * @param {Message} message Discord message
	 */
	async execute(message) {
		const page = this.getArgument(message) ?? 1
		const subscription = ensureSubscription(this.local, message)
		if (!subscription) return await message.reply('Join a voice channel first!')

		await message.reply(subscription.getNowPlaying(page))
	}
}

module.exports = NowPlaying
