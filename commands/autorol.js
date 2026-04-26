const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin, noPermReply } = require('./utils');
const { COLORS, AUTOROLES_CHANNEL_ID } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorol')
    .setDescription('Crea un mensaje de autorol en el canal de autoroles (solo admins)')
    .addRoleOption(opt =>
      opt.setName('rol').setDescription('Rol que se dará al reaccionar con ✅').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('descripcion').setDescription('Descripción del rol para el mensaje').setRequired(false)
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) return noPermReply(interaction);

    const rol = interaction.options.getRole('rol');
    const descripcion = interaction.options.getString('descripcion') || `Reacciona con ✅ para obtener el rol **${rol.name}**.`;

    const channel = interaction.guild.channels.cache.get(AUTOROLES_CHANNEL_ID);
    if (!channel) {
      return interaction.reply({ content: '❌ No se encontró el canal de autoroles.', flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setColor(rol.color || COLORS.INFO)
      .setTitle(`🏷️ Autorol — ${rol.name}`)
      .setDescription(descripcion + '\n\nReacciona con ✅ para obtener/quitar este rol automáticamente.')
      .setFooter({ text: 'Quita la reacción para remover el rol' })
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });
    await msg.react('✅');

    // Guardar en memoria global (persiste mientras el bot esté corriendo)
    if (!global.autorolData) global.autorolData = {};
    global.autorolData[msg.id] = { roleId: rol.id, guildId: interaction.guild.id };

    await interaction.reply({
      content: `✅ Mensaje de autorol creado en ${channel} para el rol **${rol.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
