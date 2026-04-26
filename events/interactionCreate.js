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
        await command.execute(interaction);
      } catch (error) {
        console.error(`[CMD ERROR] /${interaction.commandName}:`, error);
        const msg = { content: '❌ Ocurrió un error al ejecutar este comando.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
      return;
    }


    // Botones (tickets)
    if (interaction.isButton()) {
       const id = interaction.customId;
      if (!id) return;
      const ticketHandler = require('./ticketButtons');
      await ticketHandler.execute(interaction, client);
    }

    try {
        if (id.startsWith('fichar_aceptar_')) {
          await ficharCmd.handleAceptar(interaction);
          return;
        }
        if (id.startsWith('fichar_rechazar_')) {
          await ficharCmd.handleRechazar(interaction);
          return;
        }
        // ── Aquí puedes agregar más bloques de botones de otros comandos ──
      } catch (error) {
        console.error(`[BUTTON ERROR] ${id}:`, error);
        const msg = { content: '❌ Ocurrió un error al procesar este botón.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
  }
}