const { ADMIN_ROLES } = require('../config');

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
  },
};
