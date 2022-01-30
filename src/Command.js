const { Message } = require('discord.js')

class Command {
	/**
	 * @param {String} name Command name. Must be lower case.
	 * @param {Object} local Local state reference.
	 * @constructor
	 */
	constructor(name, local) {
		/**
		 * Local state reference.
		 * @type {Object}
		 */
		this.local = local
		
		/**
		 * Command name
		 * @type {String}
		 */
		this.name = name
	}

	/**
	 * @abstract
	 * Execute the command.
	 * @param {Message} message Discord message
	 */
	async execute(message) {}

	/**
	 * Get command argument.
	 * @param {Message} message Discord message
	 */
	getArgument(message) {
		return message.content.replace(`!${this.name}`, '').trim()
	}
}

module.exports = Command
