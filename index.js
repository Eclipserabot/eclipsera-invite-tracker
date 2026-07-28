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
].map(command => command.toJSON());

client.once(Events.ClientReady, async () => {

    console.log(`Logged in as ${client.user.tag}`);

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(
            process.env.CLIENT_ID,
            process.env.GUILD_ID
        ),
        {
            body: commands
        }
    );

    const guild = await client.guilds.fetch(process.env.GUILD_ID);

    const invites = await guild.invites.fetch();

    inviteCache.set(guild.id, new Collection());

    invites.forEach(invite => {
        inviteCache.get(guild.id).set(invite.code, invite);
    });

    console.log("Invite cache loaded.");
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

    inviteCache.set(guild.id, new Collection());

    for (const invite of newInvites.values()) {
        inviteCache.get(guild.id).set(invite.code, invite);
    }

    if (!usedInvite) {
        console.log("Could not detect used invite.");
        return;
    }

    console.log(`${member.user.tag} joined using ${usedInvite.code}`);

    db.addPending(
        member.id,
        usedInvite.inviter.id,
        guild.id
    );

});
});
client.on(Events.MessageCreate, async message => {

    if (message.author.bot) return;
    if (!message.guild) return;

    const pending = db.getPending(
        message.author.id,
        message.guild.id
    );

    if (!pending) return;

    if (pending.verified) return;

    const count = db.addMessage(
        message.author.id,
        message.guild.id
    );

    if (count >= 5) {

        db.verifyInvite(
            message.author.id,
            message.guild.id
        );

        console.log(
            `${message.author.tag} completed 5 messages. Invite verified.`
        );

    }

});

client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "invites") {

        const count = db.getInviteCount(
            interaction.user.id,
            interaction.guild.id
        );

        await interaction.reply({
            content: `✅ You have **${count} verified invite(s).**`,
            ephemeral: true
        });

    }

    if (interaction.commandName === "top") {

        const top = db.getLeaderboard(interaction.guild.id);

        if (top.length === 0) {
            return interaction.reply("No verified invites yet.");
        }

        let text = "**🏆 Invite Leaderboard**\n\n";

        for (let i = 0; i < top.length; i++) {

            const user = await client.users.fetch(top[i].inviterId).catch(() => null);

            text += `${i + 1}. ${user ? user.tag : top[i].inviterId} — ${top[i].count}\n`;

        }

        await interaction.reply(text);

    }

});
client.login(process.env.TOKEN);
