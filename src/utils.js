const { joinVoiceChannel } = require('@discordjs/voice')
const { Collection, Message } = require('discord.js')
const Subscription = require('./Subscription')
/**
 * Get subscriptions collection from local state. If not exist create a new one.
 *
 * @param {Object} local Local state
 * @returns {Collection<String,Subscription>} Subscription collection
 */
function ensureSubscriptions(local) {
	if (!local.subscriptions) local.subscriptions = new Collection()
	return local.subscriptions
}

/**
 * Get subscription from local state. If not exist create a new one.
 * @param {Object} local Local state
 * @param {Message}	message Discord message object
 * @returns {Subscription|false} subscription, `false` if user did not join voice channel.
 */
function ensureSubscription(local, message) {
	const channel = message.member.voice.channel
	if (!channel) return false

	const subscriptions = ensureSubscriptions(local)
	let subscription = subscriptions.get(message.guildId)

	if (!subscription) {
		// connect
		const connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guildId,
			adapterCreator: channel.guild.voiceAdapterCreator,
		})

		subscription = new Subscription(message.guildId, connection)

		subscription.on('kicked', () => {
			console.log('Bot kicked')
			subscriptions.delete(channel.guildId)
		})

		subscription.on('destroyed', () => {
			console.log('Connection destroyed')
			subscriptions.delete(channel.guildId)
		})
		subscriptions.set(channel.guildId, subscription)
	}

	return subscription
}

module.exports = { ensureSubscriptions, ensureSubscription }
