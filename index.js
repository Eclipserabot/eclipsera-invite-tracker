require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Events,
  Collection
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const inviteCache = new Collection();

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const guild = await client.guilds.fetch(process.env.GUILD_ID);

  const invites = await guild.invites.fetch();

  const cache = new Collection();

  invites.forEach(invite => {
    cache.set(invite.code, invite.uses);
  });

  inviteCache.set(guild.id, cache);

  console.log("Invite cache loaded.");
});

client.login(process.env.TOKEN);
