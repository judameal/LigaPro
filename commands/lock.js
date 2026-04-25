const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isAdmin, noPermReply } = require('./utils');
const { COLORS, ADMIN_ROLES } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Cierra el canal para todos excepto admins (solo admins)'),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) return noPermReply(interaction);

    const channel = interaction.channel;

    // Bloquear para @everyone
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
    });

    // Asegurarse que los admins sigan teniendo acceso
    for (const roleId of ADMIN_ROLES) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (role) {
        await channel.permissionOverwrites.edit(role, {
          SendMessages: true,
          CreatePublicThreads: true,
        });
      }
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle('🔒 Canal Cerrado')
      .setDescription(`El canal **${channel.name}** ha sido cerrado.\nSolo los administradores pueden escribir.`)
      .setTimestamp()
      .setFooter({ text: `Cerrado por ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
  },
};
