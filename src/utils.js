const { Collection } = require('discord.js')
const Subscription = require('./subscription')
/**
 * @param {Object} local Local state
 * @returns {Collection<String,Subscription>} Subscriptions
 */
function getSubscriptions(local) {
	return local.subscriptions
}

module.exports = { getSubscriptions }
