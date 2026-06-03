require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { readdirSync } = require('fs');
const path = require('path');
const { withErrorHandling } = require('./utils/errorHandler');
const { startAutoUpdateScheduler } = require('./scripts/auto-update');

// Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember],
});

// Command & Event Handlers
client.commands = new Collection();
client.cooldowns = new Collection();
client.queue = new Map();

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      command.execute = withErrorHandling(command.execute);
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Login to Discord
client.login(process.env.TOKEN)
  .then(() => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`🌐 Dashboard: ${process.env.DASHBOARD_URL}`);
    console.log(`🔗 Invite Link: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`);

    // Start auto-update scheduler
    startAutoUpdateScheduler();
  })
  .catch(err => console.error('❌ Discord login error:', err));

// Export client for dashboard
module.exports = client;
