require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    Events,
    EmbedBuilder
} = require("discord.js");

const db = require("./database");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
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

client.on(Events.InviteCreate, async invite => {
    const guildInvites = await invite.guild.invites.fetch();
    invites.set(invite.guild.id, guildInvites);
});

client.on(Events.InviteDelete, async invite => {
    const guildInvites = await invite.guild.invites.fetch();
    invites.set(invite.guild.id, guildInvites);
});

client.on(Events.GuildMemberAdd, async member => {

    console.log(`${member.user.tag} joined`);

    const oldInvites = invites.get(member.guild.id);
    const newInvites = await member.guild.invites.fetch();

    invites.set(member.guild.id, newInvites);

    let usedInvite = null;

    for (const invite of newInvites.values()) {

        const oldInvite = oldInvites?.get(invite.code);

        if (!oldInvite || invite.uses > oldInvite.uses) {
            usedInvite = invite;
            break;
        }
    }

    if (!usedInvite) {
        console.log("Invite not detected.");
        return;
    }

    db.addPending(member.id, usedInvite.inviter.id);

    console.log(
        `${member.user.tag} joined using ${usedInvite.code}. Waiting for 5 messages.`
    );
});
client.on(Events.MessageCreate, async message => {

    if (message.author.bot) return;
    if (!message.guild) return;

    const inviter = db.getInviter(message.author.id);

    if (!inviter) return;

    const count = db.addMessage(message.author.id);

    console.log(`${message.author.tag} message count: ${count}`);

    if (count >= 5) {

        db.completeInvite(message.author.id);

        console.log(
            `${message.author.tag} reached 5 messages. Invite counted.`
        );

        try {
            await message.channel.send(
                `🎉 <@${inviter}> received **+1 invite** because <@${message.author.id}> completed 5 messages!`
            );
        } catch (err) {
            console.error(err);
        }
    }
});

client.on(Events.InviteCreate, async invite => {
    const guildInvites = await invite.guild.invites.fetch();
    invites.set(invite.guild.id, guildInvites);
});

client.on(Events.InviteDelete, async invite => {
    const guildInvites = await invite.guild.invites.fetch();
    invites.set(invite.guild.id, guildInvites);
});

client.on(Events.GuildMemberAdd, async member => {

    console.log(`${member.user.tag} joined`);

    const oldInvites = invites.get(member.guild.id);
    const newInvites = await member.guild.invites.fetch();

    invites.set(member.guild.id, newInvites);

    let usedInvite = null;

    for (const invite of newInvites.values()) {

        const oldInvite = oldInvites?.get(invite.code);

        if (!oldInvite || invite.uses > oldInvite.uses) {
            usedInvite = invite;
            break;
        }
    }

    if (!usedInvite) {
        console.log("Invite not detected.");
        return;
    }

    db.addPending(member.id, usedInvite.inviter.id);

    console.log(
        `${member.user.tag} joined using ${usedInvite.code}. Waiting for 5 messages.`
    );
});
client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "invites") {

        const user =
            interaction.options.getUser("user") || interaction.user;

        const count = db.getInvites(user.id);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("Invite Count")
            .setDescription(
                `👤 **${user.username}** has **${count}** valid invites.`
            );

        return interaction.reply({
            embeds: [embed]
        });
    }

    if (interaction.commandName === "leaderboard") {

        const leaderboard = db.getLeaderboard();

        if (leaderboard.length === 0) {
            return interaction.reply("No invites recorded yet.");
        }

        let text = "";

        leaderboard.slice(0, 10).forEach(([id, invites], index) => {
            text += `**${index + 1}.** <@${id}> — **${invites}** invites\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle("🏆 Invite Leaderboard")
            .setDescription(text);

        return interaction.reply({
            embeds: [embed]
        });
    }
});

client.login(process.env.TOKEN);
