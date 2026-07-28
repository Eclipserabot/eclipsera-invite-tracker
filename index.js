require("dotenv").config();
const fs = require("fs");

const DB_FILE = "./database.json";

function loadDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
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
client.on(Events.GuildMemberAdd, async (member) => {

    const guild = member.guild;

    const oldCache = inviteCache.get(guild.id);

    await new Promise(resolve => setTimeout(resolve, 3000));

    const invites = await guild.invites.fetch();

    let usedInvite = null;

    for (const invite of invites.values()) {

        const oldUses = oldCache?.get(invite.code) ?? 0;

        if (invite.uses > oldUses) {
            usedInvite = invite;
            break;
        }

    }

    const newCache = new Collection();

    invites.forEach(invite => {
        newCache.set(invite.code, invite.uses);
    });

    inviteCache.set(guild.id, newCache);

    if (!usedInvite) {
        console.log("❌ Invite detect nahi hua.");
        return;
    }

    console.log(
        `✅ ${member.user.tag} joined using ${usedInvite.code} | Inviter: ${usedInvite.inviter?.tag}`
    );
const db = loadDB();

db.pending[member.id] = {
    inviterId: usedInvite.inviter.id,
    inviterTag: usedInvite.inviter.tag,
    inviteCode: usedInvite.code
};

saveDB(db);

console.log("Pending invite saved.");
});
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "invites") {

        await interaction.reply({
            content: "✅ Bot is working! Invite system is under setup.",
            ephemeral: true
        });

    }

    if (interaction.commandName === "top") {

        await interaction.reply({
            content: "🏆 Leaderboard is under setup.",
            ephemeral: true
        });

    }

});
client.on(Events.MessageCreate, (message) => {

    if (message.author.bot) return;
    if (!message.guild) return;

    const db = loadDB();

    const pending = db.pending[message.author.id];

    if (!pending) return;

    if (!db.messages[message.author.id]) {
        db.messages[message.author.id] = 0;
    }

    db.messages[message.author.id]++;

    console.log(
        `${message.author.tag} : ${db.messages[message.author.id]}/5`
    );

    saveDB(db);

});
client.login(process.env.TOKEN);
