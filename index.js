require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection,
    EmbedBuilder,
    Events
} = require("discord.js");

const db = require("./database");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel
    ]
});

// Invite Cache
const invites = new Collection();

client.once(Events.ClientReady, async () => {

    console.log(`${client.user.tag} is online!`);

    for (const guild of client.guilds.cache.values()) {

        try {

            const guildInvites = await guild.invites.fetch();

            invites.set(guild.id, guildInvites);

            console.log(
                `Cached ${guildInvites.size} invites for ${guild.name}`
            );

        } catch (err) {

            console.log(
                `Couldn't cache invites for ${guild.name}`
            );

        }

    }

});

// New Invite Created
client.on(Events.InviteCreate, invite => {

    const guildInvites = invites.get(invite.guild.id);

    if (guildInvites)
        guildInvites.set(invite.code, invite);

});

// Invite Deleted
client.on(Events.InviteDelete, invite => {

    const guildInvites = invites.get(invite.guild.id);

    if (guildInvites)
        guildInvites.delete(invite.code);

});
// Member Joined
client.on(Events.GuildMemberAdd, async (member) => {

    const oldInvites = invites.get(member.guild.id);

    let newInvites;

    try {
        newInvites = await member.guild.invites.fetch();
        invites.set(member.guild.id, newInvites);
    } catch (err) {
        console.error("Failed to fetch invites:", err);
        return;
    }

    const usedInvite = newInvites.find(invite => {
        const old = oldInvites?.get(invite.code);
        return old && invite.uses > old.uses;
    });

    if (!usedInvite) {
        console.log(`${member.user.tag} joined but invite not detected.`);
        return;
    }

    console.log(
        `${member.user.tag} joined using ${usedInvite.code} by ${usedInvite.inviter.tag}`
    );

    db.addPending(
        member.id,
        usedInvite.inviter.id
    );

});
// Count Messages
client.on(Events.MessageCreate, async (message) => {

    if (message.author.bot) return;

    if (!message.guild) return;

    const count = db.addMessage(message.author.id);

    if (count !== 5) return;

    const inviter = db.completeInvite(message.author.id);

    if (!inviter) return;

    console.log(
        `${message.author.tag} completed verification. Invite credited to ${inviter}`
    );

});

// Slash Commands
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "invites") {

        const invites = db.getInvites(interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle("Your Invites")
            .setDescription(`✅ Verified Invites: **${invites}**`)
            .setColor("Green");

        return interaction.reply({
            embeds: [embed]
        });

    }

    if (interaction.commandName === "leaderboard") {

        const leaderboard = db.getLeaderboard();

        if (!leaderboard.length) {

            return interaction.reply({
                content: "No verified invites yet."
            });

        }

        let text = "";

        leaderboard.slice(0, 10).forEach((user, index) => {

            text += `${index + 1}. <@${user[0]}> — **${user[1]}** invites\n`;

        });

        const embed = new EmbedBuilder()
            .setTitle("🏆 Invite Leaderboard")
            .setDescription(text)
            .setColor("Gold");

        return interaction.reply({
            embeds: [embed]
        });

    }

});

// Login
client.login(process.env.TOKEN);
