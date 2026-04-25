const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin, noPermReply } = require('./utils');
const { COLORS } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sancionar')
    .setDescription('Sanciona (timeout) a un usuario por X horas (solo admins)')
    .addUserOption(opt =>
      opt.setName('usuario').setDescription('Usuario a sancionar').setRequired(true)
    )
    .addNumberOption(opt =>
      opt.setName('horas').setDescription('Duración en horas').setRequired(true).setMinValue(0.1).setMaxValue(672)
    )
    .addStringOption(opt =>
      opt.setName('razon').setDescription('Razón de la sanción').setRequired(false)
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) return noPermReply(interaction);

    const target = interaction.options.getMember('usuario');
    const horas = interaction.options.getNumber('horas');
    const razon = interaction.options.getString('razon') || 'Sin razón especificada';

    if (!target) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });
    if (isAdmin(target)) return interaction.reply({ content: '❌ No puedes sancionar a un administrador.', ephemeral: true });

    const duracionMs = horas * 60 * 60 * 1000;

    try {
      await target.timeout(duracionMs, razon);
    } catch (err) {
      return interaction.reply({ content: `❌ No se pudo sancionar al usuario: ${err.message}`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle('⏰ Usuario Sancionado')
      .addFields(
        { name: '👤 Usuario', value: `${target}`, inline: true },
        { name: '⏱️ Duración', value: `${horas} hora(s)`, inline: true },
        { name: '📝 Razón', value: razon },
        { name: '🔨 Sancionado por', value: `${interaction.user}`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Notificar al usuario por DM
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.WARNING)
          .setTitle('⚠️ Has sido sancionado')
          .setDescription(`Fuiste sancionado en **${interaction.guild.name}** por **${horas} hora(s)**.\n\n**Razón:** ${razon}`)
          .setTimestamp(),
      ],
    }).catch(() => {}); // Si no acepta DMs, ignorar
  },
};
