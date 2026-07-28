require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Collection,
    Events,
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

const db = require("./database");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const inviteCache = new Collection();

const commands = [
    new SlashCommandBuilder()
        .setName("invites")
        .setDescription("Show your verified invites"),

    new SlashCommandBuilder()
        .setName("top")
        .setDescription("Show invite leaderboard")
].map(cmd => cmd.toJSON());

client.once(Events.ClientReady, async () => {

    console.log(`✅ Logged in as ${client.user.tag}`);

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(
            CLIENT_ID,
            GUILD_ID
        ),
        { body: commands }
    );

    const guild = await client.guilds.fetch(GUILD_ID);

    const invites = await guild.invites.fetch();

    const cache = new Collection();

    invites.forEach(invite => {
        cache.set(invite.code, invite);
    });

    inviteCache.set(guild.id, cache);

    console.log("✅ Invite cache loaded.");

});
client.on(Events.InviteCreate, invite => {

    const guildInvites = inviteCache.get(invite.guild.id);

    if (guildInvites) {
        guildInvites.set(invite.code, invite);
    }

});

client.on(Events.InviteDelete, invite => {

    const guildInvites = inviteCache.get(invite.guild.id);

    if (guildInvites) {
        guildInvites.delete(invite.code);
    }

});

client.on(Events.GuildMemberAdd, async member => {

    const guild = member.guild;

    const oldInvites = inviteCache.get(guild.id);

    await new Promise(resolve => setTimeout(resolve, 5000));

    const newInvites = await guild.invites.fetch();

    let usedInvite = null;

    for (const invite of newInvites.values()) {

        const oldInvite = oldInvites?.get(invite.code);

        if (!oldInvite) continue;

        if (invite.uses > oldInvite.uses) {
            usedInvite = invite;
            break;
        }

    }

    const cache = new Collection();

    newInvites.forEach(invite => {
        cache.set(invite.code, invite);
    });

    inviteCache.set(guild.id, cache);

    if (!usedInvite) {

        console.log(`❌ Could not detect invite for ${member.user.tag}`);

        return;

    }

    console.log(
        `✅ ${member.user.tag} joined using ${usedInvite.code}`
    );

    db.addPending(
        member.id,
        usedInvite.inviter.id,
        guild.id
    );

});
client.on(Events.MessageCreate, async message => {

    if (message.author.bot) return;
    if (!message.guild) return;

    const invite = db.getInvite(message.author.id);

    if (!invite) return;

    if (invite.verified) return;

    const count = db.addMessage(
        message.author.id,
        message.guild.id
    );

    if (count >= 5) {

        db.verify(message.author.id);

        console.log(
            `✅ ${message.author.tag} completed 5 messages. Invite verified.`
        );

    }

});

client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "invites") {

        const total = db.getInviteCount(
            interaction.user.id,
            interaction.guild.id
        );

        await interaction.reply({
            content: `🎉 You have **${total} verified invite(s).**`,
            ephemeral: true
        });

    }

    if (interaction.commandName === "top") {

        const list = db.leaderboard(interaction.guild.id);

        if (list.length === 0) {
            return interaction.reply("No verified invites yet.");
        }

        let text = "🏆 **Invite Leaderboard**\n\n";

        for (let i = 0; i < list.length; i++) {

            const user = await client.users
                .fetch(list[i].inviterId)
                .catch(() => null);

            text += `${i + 1}. ${user ? user.tag : list[i].inviterId} — ${list[i].total}\n`;

        }

        await interaction.reply(text);

    }

});

client.login(TOKEN);
