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
  Collection,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
const inviteCache = new Collection();

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
const commands = [
    new SlashCommandBuilder()
        .setName("invites")
        .setDescription("Show verified invites")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to check")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("top")
        .setDescription("Show the invite leaderboard")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

await rest.put(
    Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
    ),
    { body: commands }
);

console.log("✅ Slash commands updated.");
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

    const db = loadDB();

    if (interaction.commandName === "invites") {

    const target = interaction.options.getUser("user") || interaction.user;

    const invites = db.invites[target.id] || 0;

    await interaction.reply({
        content: `📨 ${target.username} has **${invites}** verified invite(s).`
    });

    }
    if (interaction.commandName === "top") {

        const sorted = Object.entries(db.invites)
            .sort((a, b) => b[1] - a[1]);

        if (sorted.length === 0) {
            return interaction.reply("No verified invites yet.");
        }

        let text = "🏆 **Invite Leaderboard**\n\n";

        for (let i = 0; i < sorted.length; i++) {

            const user = await client.users.fetch(sorted[i][0]).catch(() => null);

            text += `${i + 1}. ${user ? user.tag : sorted[i][0]} - ${sorted[i][1]}\n`;

        }

        await interaction.reply(text);

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

if (db.messages[message.author.id] >= 5) {

    if (!db.invites[pending.inviterId]) {
        db.invites[pending.inviterId] = 0;
    }

    db.invites[pending.inviterId]++;

// Save verified member
db.verified[message.author.id] = pending.inviterId;

delete db.pending[message.author.id];
delete db.messages[message.author.id];

    console.log(
        `✅ Invite verified for ${pending.inviterTag}`
    );
}

saveDB(db);
    
});
client.on(Events.GuildMemberRemove, (member) => {

    const db = loadDB();

    const inviterId = db.verified[member.id];

    if (!inviterId) return;

    if (db.invites[inviterId] && db.invites[inviterId] > 0) {
        db.invites[inviterId]--;
    }

    delete db.verified[member.id];

    saveDB(db);

    console.log(`❌ ${member.user.tag} left. Invite removed.`);
});
client.login(process.env.TOKEN);
