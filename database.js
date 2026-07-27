const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('invites')
    .setDescription('किसी का invite count देखो')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('जिसका count देखना है')
        .setRequired(false))
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Slash commands register हो रहे हैं...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('Command register हो गई!');
  } catch (error) {
    console.error(error);
  }
})();
