const { ADMIN_ROLES } = require('../config');
const ficharCmd = require('../commands/fichar');
module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`❌ Error ejecutando /${interaction.commandName}:`, error);
        const msg = { content: '❌ Hubo un error ejecutando este comando.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }
    }

    // Botones (tickets)
    if (interaction.isButton()) {
      const ticketHandler = require('./ticketButtons');
      await ticketHandler.execute(interaction, client);
    }

    if (interaction.customId.startsWith('fichar_aceptar_')) {
  await ficharCmd.handleAceptar(interaction);
  return;
}
if (interaction.customId.startsWith('fichar_rechazar_')) {
  await ficharCmd.handleRechazar(interaction);
  return;
}
  },
};
