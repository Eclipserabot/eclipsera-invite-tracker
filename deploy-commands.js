require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

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

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        console.log("Registering slash commands...");

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log("✅ Slash commands registered successfully.");

    } catch (error) {
        console.error(error);
    }
})();
