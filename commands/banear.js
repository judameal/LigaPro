const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin, noPermReply } = require('./utils');
const { COLORS } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banear')
    .setDescription('Banea permanentemente a un usuario del servidor (solo admins)')
    .addUserOption(opt =>
      opt.setName('usuario').setDescription('Usuario a banear').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('razon').setDescription('Razón del baneo').setRequired(false)
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) return noPermReply(interaction);

    const target = interaction.options.getMember('usuario');
    const razon = interaction.options.getString('razon') || 'Sin razón especificada';

    if (!target) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });
    if (isAdmin(target)) return interaction.reply({ content: '❌ No puedes banear a un administrador.', ephemeral: true });

    // Notificar antes de banear
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.ERROR)
          .setTitle('🔨 Has sido baneado')
          .setDescription(`Fuiste baneado permanentemente de **${interaction.guild.name}**.\n\n**Razón:** ${razon}`)
          .setTimestamp(),
      ],
    }).catch(() => {});

    try {
      await target.ban({ reason: razon, deleteMessageSeconds: 86400 });
    } catch (err) {
      return interaction.reply({ content: `❌ No se pudo banear al usuario: ${err.message}`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle('🔨 Usuario Baneado')
      .addFields(
        { name: '👤 Usuario', value: `${target.user.tag}`, inline: true },
        { name: '📝 Razón', value: razon },
        { name: '🔨 Baneado por', value: `${interaction.user}`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
