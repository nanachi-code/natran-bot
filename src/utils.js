const { Collection } = require('discord.js')
const Subscription = require('./Subscription')
/**
 * @param {Object} local Local state
 * @returns {Collection<String,Subscription>} Subscriptions
 */
function getSubscriptions(local) {
	if (!local.subscriptions) local.subscriptions = new Collection()
	return local.subscriptions
}

module.exports = { getSubscriptions }
