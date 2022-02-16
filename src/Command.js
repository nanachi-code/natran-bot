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
		let content = message.content

		if (content.includes(`!${this.name}`)) {
			let arg = content.replace(`!${this.name}`, '').trim()
			if (!arg.length) return null
			return arg
		} else {
			for (const alias of this.alias) {
				if (content.includes(`!${alias}`)) {
					let arg = content.replace(`!${alias}`, '').trim()
					if (arg.length) return arg
				}
			}

			return null
		}
	}
}

module.exports = Command
