
require("dotenv").config();
const db = require("./database");
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.GuildMember],
});

const invites = new Map();
const pendingInvites = new Map();

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  for (const guild of client.guilds.cache.values()) {
    const guildInvites = await guild.invites.fetch();
    invites.set(guild.id, guildInvites);
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
    pendingInvites.set(member.id, {
  inviterId: usedInvite.inviter.id,
  inviterTag: usedInvite.inviter.tag,
  code: usedInvite.code,
});

    console.log(
      `${member.user.tag} joined using ${usedInvite.code}`
    );
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (!oldMember.pending && newMember.pending) return;

  if (oldMember.pending && !newMember.pending) {
    const data = pendingInvites.get(newMember.id);

    if (data) {
      db.addInvite(data.inviterId);

console.log(
`${newMember.user.tag} accepted rules. Invite by ${data.inviterTag} counted.`
);

pendingInvites.delete(newMember.id);
    }
  }
});
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "invites") {
      const user = interaction.options.getUser("user") || interaction.user;
      const count = db.getInvites(user.id);

      await interaction.reply({
        content: `📨 ${user.username} has **${count}** valid invites.`,
      });
    }
  } catch (err) {
    console.error(err);

    if (!interaction.replied) {
  await interaction.reply({
    content: "❌ Error while executing command.",
    ephemeral: true,
  });
    }
        content: "❌ Error while executing command.",
        ephemeral: true,
      });
    }
  }
});

client.login(process.env.TOKEN);
