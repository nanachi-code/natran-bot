require('dotenv').config()

const Bot = require('./src/Bot')

let bot = new Bot()
bot.start()
