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
        GatewayIntentBits.GuildInvites
    ],
    partials: [Partials.GuildMember]
});

const invites = new Map();
const pendingInvites = new Map();

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

    if (usedInvite) {
        pendingInvites.set(member.id, usedInvite.inviter.id);

        console.log(
            `${member.user.tag} joined using ${usedInvite.code}. Waiting for rules acceptance...`
        );
    }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {

    if (!oldMember.pending && newMember.pending) return;

    if (oldMember.pending && !newMember.pending) {

        const inviterId = pendingInvites.get(newMember.id);

        if (!inviterId) return;

        db.addInvite(inviterId);

        pendingInvites.delete(newMember.id);

        console.log(
            `${newMember.user.tag} accepted Membership Screening. Invite counted.`
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
            .setColor(0x5865F2)
            .setTitle("Invite Count")
            .setDescription(
                `👤 **${user.username}** has **${count}** valid invites.`
            );

        await interaction.reply({
            embeds: [embed],
        });
    }

    if (interaction.commandName === "leaderboard") {

        const leaderboard = db.getLeaderboard();

        if (leaderboard.length === 0) {
            return interaction.reply("No invites recorded yet.");
        }

        let text = "";

        for (let i = 0; i < leaderboard.length; i++) {

            const [id, invites] = leaderboard[i];

            text += `**${i + 1}.** <@${id}> — **${invites}** invites
