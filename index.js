require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Collection,
    Events
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

client.once(Events.ClientReady, async () => {

    console.log(`${client.user.tag} is online`);

    for (const guild of client.guilds.cache.values()) {

        try {

            const invites = await guild.invites.fetch();

            inviteCache.set(guild.id, invites);

            console.log(
                `Cached ${invites.size} invites for ${guild.name}`
            );

        } catch (err) {

            console.log(
                `Failed to cache invites for ${guild.name}`,
                err
            );

        }

    }

});

client.on(Events.InviteCreate, invite => {

    const guildInvites =
        inviteCache.get(invite.guild.id) || new Collection();

    guildInvites.set(invite.code, invite);

    inviteCache.set(invite.guild.id, guildInvites);

});

client.on(Events.InviteDelete, invite => {

    const guildInvites =
        inviteCache.get(invite.guild.id);

    if (!guildInvites) return;

    guildInvites.delete(invite.code);

});
client.on(Events.GuildMemberAdd, async (member) => {

    const guild = member.guild;

    const oldInvites = inviteCache.get(guild.id);

    try {

        // Discord ko invite uses update karne ka time do
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newInvites = await guild.invites.fetch();

        inviteCache.set(guild.id, newInvites);

        const usedInvite = newInvites.find(invite => {

            const oldInvite = oldInvites?.get(invite.code);

            return oldInvite && invite.uses > oldInvite.uses;

        });

        if (!usedInvite) {

            console.log(
                `${member.user.tag} joined but invite not detected.`
            );

            return;

        }

        if (!usedInvite.inviter) {

            console.log(
                `${member.user.tag} joined but inviter missing.`
            );

            return;

        }

        db.addPending(
            member.id,
            usedInvite.inviter.id,
            guild.id
        );

        console.log(
            `${member.user.tag} joined using ${usedInvite.code} invited by ${usedInvite.inviter.tag}`
        );

    } catch (err) {

        console.error(
            "GuildMemberAdd Error:",
            err
        );

    }

});
client.on(Events.MessageCreate, async (message) => {

    if (message.author.bot) return;
    if (!message.guild) return;

    const pending = db.getPending(
        message.author.id,
        message.guild.id
    );

    // User invite se join nahi hua
    if (!pending) return;

    // Invite pehle hi verify ho chuka
    if (pending.verified === 1) return;

    // Message count +1
    const count = db.addMessage(
        message.author.id,
        message.guild.id
    );

    console.log(
        `${message.author.tag} -> ${count}/5 messages`
    );

    // 5 messages complete
    if (count >= 5) {

        db.verifyInvite(
            message.author.id,
            message.guild.id
        );

        console.log(
            `✅ Invite verified for ${pending.inviterId}`
        );

        try {

            const inviter =
                await client.users.fetch(
                    pending.inviterId
                );

            inviter.send(
                `🎉 Your invite has been verified!\n${message.author.tag} completed 5 messages.\nYou received **+1 invite**.`
            ).catch(() => {});

        } catch {}

    }

});
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    // /invites
    if (interaction.commandName === "invites") {

        const count = db.getInviteCount(
            interaction.user.id,
            interaction.guild.id
        );

        return interaction.reply({
            content: `🎉 You have **${count}** verified invite(s).`
        });

    }

    // /top
    if (interaction.commandName === "top") {

        const leaderboard = db.getLeaderboard(
            interaction.guild.id
        );

        if (leaderboard.length === 0) {

            return interaction.reply({
                content: "No verified invites yet."
            });

        }

        let text = "🏆 **Invite Leaderboard**\n\n";

        leaderboard.forEach((user, index) => {

            text += `${index + 1}. <@${user.inviterId}> — **${user.count}** invite(s)\n`;

        });

        return interaction.reply({
            content: text
        });

    }

});

client.login(process.env.TOKEN);
