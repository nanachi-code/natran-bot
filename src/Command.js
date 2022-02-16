const { Message } = require('discord.js')

class Command {
	/**
	 * @param {String} name Command name. Must be lower case.
	 * @param {Object} local Local state reference.
	 * @param {String[]} alias List of command alias. Must be lower case.
	 * @constructor
	 */
	constructor(name, local, alias = []) {
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

		/**
		 * Command alias
		 * @type {String[]}
		 */
		this.alias = alias
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
	 * @returns {string|null}
	 */
	getArgument(message) {
		let arg = message.content.replace(`!${this.name}`, '').trim()
		if (!arg) return null
		return arg
	}
}

module.exports = Command
