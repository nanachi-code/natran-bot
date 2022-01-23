require("dotenv").config()
const { SlashCommandBuilder } = require('@discordjs/builders')
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')

const commands = [
	new SlashCommandBuilder().setName('play').setDescription('Play').addStringOption(opt => opt.setName('input').setDescription('Enter YouTube url/ keyword to search for')),
	new SlashCommandBuilder().setName('np').setDescription('Now playing'),
	new SlashCommandBuilder().setName('stop').setDescription('Stop'),
	new SlashCommandBuilder().setName('skip').setDescription('Skip'),
].map((command) => command.toJSON())

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN)

rest
	.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error)
