const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
const { initDB, addInvite, getInvites } = require('./database');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const invites = new Map();
const pendingInvites = new Map(); // userId: inviterId
const messageCount = new Map(); // userId: count

client.once(Events.ClientReady, async () => {
  console.log(`Bot online: ${client.user.tag}`);
  await initDB();
  
  client.guilds.cache.forEach(async guild => {
    const guildInvites = await guild.invites.fetch();
    invites.set(guild.id, guildInvites);
  });
});

// When someone joins
client.on(Events.GuildMemberAdd, async member => {
  const guild = member.guild;
  const newInvites = await guild.invites.fetch();
  const oldInvites = invites.get(guild.id);
  
  const invite = newInvites.find(inv => {
    const oldInvite = oldInvites.get(inv.code);
    return oldInvite && oldInvite.uses < inv.uses;
  });
  invites.set(guild.id, newInvites);
  
  if (invite && invite.inviter) {
    // Save who invited this person, but DON'T count yet
    pendingInvites.set(member.id, invite.inviter.id);
    messageCount.set(member.id, 0); // Start from 0 messages
    
    const welcomeChannel = guild.channels.cache.find(ch => ch.name === 'general');
    if(welcomeChannel) {
      welcomeChannel.send(`${member}, Welcome! Send 5 messages to complete your invite.`);
    }
    console.log(`${member.user.tag} joined via ${invite.inviter.tag}. Waiting for 5 messages...`);
  }
});

// Count messages
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return; // Ignore bots
  
  const userId = message.author.id;
  
  // Check if this user is in pending list
  if (pendingInvites.has(userId)) {
    let count = messageCount.get(userId) || 0;
    count++;
    messageCount.set(userId, count);
    
    console.log(`${message.author.tag} message count:
