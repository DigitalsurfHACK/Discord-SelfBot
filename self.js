/*
  Created by TheRacingLion (https://github.com/TheRacingLion) [ 18 / 12 / 2016 ]
  -*Read LICENSE to know more about permissions*-

  Main Selfbot file. Lots of really important stuff that make this selfbot work.
*/
const Eris = require('eris')
const path = require('path')
const fs = require('fs')

const configValidator = require('./src/utils/ConfigValidator.js')
const constants = require('./src/utils/Constants.js')
const log = require('./src/plugins/Logger.js')

const config = require('./config/config.json')
const games = require('./config/games.json')

const Command = require('./src/Command.js')

const gumerPSN = require('gumer-psn')
const xbox = require('node-xbox')(config.XBOX.apikey || '')

// Check if config is valid
configValidator.check(config, log)

// Setup discord client (RAILWAY SAFE)
const self = new Eris(process.env.DISCORD_TOKEN || config.token)
let isReady = false

// Pass config and constants to self
self.constants = constants
self.config = config

const counts = {
  msgsGot: 0,
  msgsSent: 0,
  mentionsGot: 0,
  keywordsGot: 0
}

const commands = {
  main: {},
  aliases: {}
}

// Register Command Function
self.registerCommand = function (name, generator, options) {
  if (!name) throw new Error('You must specify a name for the command')
  if (name.includes(' ')) throw new Error('Command names cannot contain spaces')
  if (commands.main[name]) throw new Error(`You have already registered a command for ${name}`)

  options = options || {}
  name = name.toLowerCase()
  commands.main[name] = new Command(self, name, generator, options)

  if (options.aliases && options.aliases.length > 0) {
    options.aliases.forEach(alias => {
      commands.aliases[alias] = name
    })
  }
  return commands.main[name]
}

self.on('messageCreate', (msg) => {
  counts.msgsGot++
  if (!isReady || !msg.author) return
  if (msg.author.id !== self.user.id) return

  const prefix = self.config.prefix.replace(/@mention/g, self.user.mention)
  if (msg.content.replace(/<@!/g, '<@').startsWith(prefix)) {
    if (msg.content.length === prefix.length) return

    const args = msg.content.replace(/<@!/g, '<@').substring(prefix.length).split(' ')
    let trigger = args.shift().toLowerCase()
    trigger = commands.aliases[trigger] || trigger

    const command = commands.main[trigger]
    if (command) {
      log.cmd(msg, self)
      setTimeout(() => self.deleteMessage(msg.channel.id, msg.id), 750)
      command.process(msg, args)
    }
  }
})

// Events
self.on('warn', msg => { if (msg.includes('Authentication')) log.warn(msg) })
self.on('error', err => log.err(err, 'Bot'))
self.on('disconnect', () => log.log('Disconnected from Discord', 'Disconnect'))

// Load avatars
let avatars = []
if (config.rotateAvatarImage) {
  const dir = path.join(__dirname, 'config/avatars/')
  fs.readdir(dir, (err, files) => {
    if (err || !files) return
    for (let avatar of files) {
      const ext = path.extname(avatar).match(/\.png|\.jpeg|\.gif|\.jpg/)
      if (!ext) continue
      const data = fs.readFileSync(path.join(dir, avatar))
      avatars.push(`data:image/${ext[0].replace('.', '')};base64,${Buffer.from(data).toString('base64')}`)
    }
  })
}

// Load commands
fs.readdir(path.join(__dirname, 'commands/'), (err, files) => {
  if (err || !files) return
  for (let command of files) {
    if (path.extname(command) !== '.js') continue
    require(`./commands/${command}`)(self)
  }
})

// Ready
self.on('ready', () => {
  isReady = true
  self.commands = commands
  self.counts = counts
  log.ready(self, config)
})

require('./src/plugins/MentionStalker.js')(self, log, config)
require('./src/plugins/KeywordLogger.js')(self, log, config)

// CONNECT
self.connect().catch(err => log.err(err, 'Login'))

process.on('SIGINT', () => {
  self.disconnect({ reconnect: false })
  setTimeout(() => process.exit(0), 1000)
})

process.on('unhandledRejection', err =>
  log.err(err, 'Promise was rejected but there was no error handler')
)
