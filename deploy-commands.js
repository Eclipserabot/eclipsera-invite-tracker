require("dotenv").config();

const {
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

const commands = [

    new SlashCommandBuilder()
        .setName("invites")
        .setDescription("Check your verified invites"),

    new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Top inviters")

].map(cmd => cmd.toJSON());

const rest = new REST({
    version: "10"
}).setToken(process.env.TOKEN);

(async () => {
    try {

        console.log("Registering Slash Commands...");

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log("Slash Commands Registered.");

    } catch (err) {
        console.error(err);
    }
})();
