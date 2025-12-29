/*
  Created by TheRacingLion (https://github.com/TheRacingLion) [ 18 / 12 / 2016 ]
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
const xbox = require('node-xbox')(
  (config.XBOX && config.XBOX.apikey) ? config.XBOX.apikey : ''
)


/* ===============================
   ENV TOKEN ONLY (NO CONFIG TOKEN)
================================ */
if (!process.env.DISCORD_TOKEN) {
  console.error('FATAL: DISCORD_TOKEN environment variable is missing')
  process.exit(1)
}

/* REMOVE TOKEN FROM CONFIG BEFORE VALIDATION */
delete config.token

// Validate config (token no longer checked)
configValidator.check(config, log)

// Create client using ENV TOKEN ONLY
const self = new Eris(process.env.DISCORD_TOKEN)
let isReady = false

// Pass config/constants
self.constants = constants
self.config = config
