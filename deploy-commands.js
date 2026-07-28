require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN || "YOUR_BOT_TOKEN";
const CLIENT_ID = process.env.CLIENT_ID || "YOUR_CLIENT_ID";
const GUILD_ID = process.env.GUILD_ID || "YOUR_SERVER_ID";

const commands = [
    new SlashCommandBuilder()
        .setName("invites")
        .setDescription("Show your verified invites"),

    new SlashCommandBuilder()
        .setName("top")
        .setDescription("Show the invite leaderboard")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {

    try {

        console.log("Registering slash commands...");

        await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log("✅ Slash commands registered.");

    } catch (err) {

        console.error(err);

    }

})();
