require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
    new SlashCommandBuilder()
        .setName("invites")
        .setDescription("Show your verified invites"),

    new SlashCommandBuilder()
        .setName("top")
        .setDescription("Show invite leaderboard")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("Registering slash commands...");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("✅ Slash commands registered.");
    } catch (err) {
        console.error(err);
    }
})();
