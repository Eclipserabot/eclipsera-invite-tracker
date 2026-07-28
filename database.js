const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const Database = require('better-sqlite3');

// Yaha apna token aur client id daal do
const TOKEN = 'MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkw'; 
const CLIENT_ID = '1234567890123456789';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const db = new Database('invites.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS invites (
    inviterId TEXT,
    inviteeId TEXT UNIQUE,
    guildId TEXT
  );
  CREATE TABLE IF NOT EXISTS messageCounts (
    userId TEXT,
    guildId TEXT,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (userId, guildId)
  );
`);

const invites = new Map();

client.once('ready', async () => {
  console.log(`Bot online: ${client.user.tag}`);
  for (const guild of client.guilds.cache.values()) {
    const guildInvites = await guild.invites.fetch();
    invites.set(guild.id, guildInvites);
  }
});

client.on('guildMemberAdd', async (member) => {
  const guild = member.guild;
  const oldInvites = invites.get(guild.id);
  const newInvites = await guild.invites.fetch();
  invites.set(guild.id, newInvites);

  const usedInvite = newInvites.find(inv => inv.uses > oldInvites.get(inv.code)?.uses || 0);
  if (usedInvite && usedInvite.inviter) {
    const stmt = db.prepare('INSERT OR IGNORE INTO invites (inviterId, inviteeId, guildId) VALUES (?, ?, ?)');
    stmt.run(usedInvite.inviter.id, member.id, guild.id);
    console.log(`${member.user.tag} joined. Waiting for 5 messages...`);
  }
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  const userId = message.author.id;
  const guildId = message.guild.id;

  const checkInvite = db.prepare('SELECT inviterId FROM invites WHERE inviteeId = ? AND guildId = ?');
  const inviteData = checkInvite.get(userId, guildId);
  if (!inviteData) return;

  const getCount = db.prepare('SELECT count FROM messageCounts WHERE userId = ? AND guildId = ?');
  let data = getCount.get(userId, guildId);
  let newCount = data ? data.count + 1 : 1;

  const upsert = db.prepare('INSERT OR REPLACE INTO messageCounts (userId, guildId, count) VALUES (?, ?, ?)');
  upsert.run(userId, guildId, newCount);
  console.log(`${message.author.tag} message count: ${newCount}/5`);

  if (newCount === 5) {
    db.prepare('INSERT OR REPLACE INTO invites (inviterId, inviteeId, guildId) VALUES (?, ?, ?)').run(inviteData.inviterId, userId, guildId);
    db.prepare('DELETE FROM messageCounts WHERE userId = ? AND guildId = ?').run(userId, guildId);
    console.log(`✅ ${message.author.tag} completed 5 messages! Invite counted for ${inviteData.inviterId}`);
  }
});

const commands = [
  new SlashCommandBuilder().setName('invites').setDescription('Check your invite count'),
  new SlashCommandBuilder().setName('top').setDescription('Show top inviters')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName === 'invites') {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM invites WHERE inviterId = ? AND guildId = ?');
    const result = stmt.get(interaction.user.id, interaction.guild.id);
    interaction.reply(`You have **${result.count}** invites.`);
  }
  if (interaction.commandName === 'top') {
    const stmt = db.prepare('SELECT inviterId, COUNT(*) as count FROM invites WHERE guildId = ? GROUP BY inviterId ORDER BY count DESC LIMIT 10');
    const results = stmt.all(interaction.guild.id);
    let text = '**Top Inviters:**\n';
    results.forEach((r, i) => text += `${i+1}. <@${r.inviterId}> - ${r.count}\n`);
    interaction.reply(text || 'No invites yet.');
  }
});

client.login(TOKEN);
