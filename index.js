require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  EmbedBuilder,
} = require("discord.js");

const db = require("./database");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.GuildMember],
});

const invites = new Map();

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  for (const guild of client.guilds.cache.values()) {
    try {
      const guildInvites = await guild.invites.fetch();
      invites.set(guild.id, guildInvites);
    } catch (err) {
      console.error(err);
    }
  }
});

client.on(Events.InviteCreate, async (invite) => {
  const guildInvites = await invite.guild.invites.fetch();
  invites.set(invite.guild.id, guildInvites);
});

client.on(Events.InviteDelete, async (invite) => {
  const guildInvites = await invite.guild.invites.fetch();
  invites.set(invite.guild.id, guildInvites);
});
client.on(Events.GuildMemberAdd, async (member) => {
  const oldInvites = invites.get(member.guild.id);
  const newInvites = await member.guild.invites.fetch();

  invites.set(member.guild.id, newInvites);

  const usedInvite = newInvites.find(
    (i) => oldInvites.get(i.code)?.uses < i.uses
  );

  if (usedInvite) {
    db.addInvite(usedInvite.inviter.id);

    console.log(
      `${member.user.tag} joined using ${usedInvite.code}`
    );
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "invites") {
    const user =
      interaction.options.getUser("user") || interaction.user;

    const count = db.getInvites(user.id);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Invite Count")
      .setDescription(
        `👤 **${user.username}** has **${count}** valid invites.`
      );

    await interaction.reply({
      embeds: [embed],
    });
  }
});

client.login(process.env.TOKEN);
