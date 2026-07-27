const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Check a user's invite count')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Select a user')
        .setRequired(false))
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Slash commands register processing...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('Command register Done');
  } catch (error) {
    console.error(error);
  }
})();
