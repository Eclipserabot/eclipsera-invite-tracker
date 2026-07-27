const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
const { initDB, addInvite, getInvites, setRulesAccepted, hasAcceptedRules } = require('./database');
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

client.once(Events.ClientReady, async () => {
  console.log(`Bot online: ${client.user.tag}`);
  await initDB(); // Database start
  
  // सारे server के invites cache करो
  client.guilds.cache.forEach(async guild => {
    const guildInvites = await guild.invites.fetch();
    invites.set(guild.id, guildInvites);
  });
});

client.on(Events.GuildMemberAdd, async member => {
  const guild = member.guild;
  const newInvites = await guild.invites.fetch();
  const oldInvites = invites.get(guild.id);
  
  const invite = newInvites.find(inv => oldInvites.get(inv.code).uses < inv.uses);
  invites.set(guild.id, newInvites);
  
  if (invite && invite.inviter) {
    await addInvite(invite.inviter.id);
    console.log(`${member.user.tag} joined by ${invite.inviter.tag}`);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'invites') {
    const user = interaction.options.getUser('user') || interaction.user;
    const count = await getInvites(user.id);
    
    const embed = new EmbedBuilder()
     .setTitle(`${user.username} के Invites`)
     .setDescription(`**Total Invites: ${count}**`)
     .setColor(0x5865F2);
      
    await interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
