const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin, noPermReply } = require('./utils');
const { COLORS } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Abre el canal para todos (solo admins)'),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) return noPermReply(interaction);

    const channel = interaction.channel;

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: null,
      CreatePublicThreads: null,
      CreatePrivateThreads: null,
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('🔓 Canal Abierto')
      .setDescription(`El canal **${channel.name}** ha sido abierto.\nTodos pueden volver a escribir.`)
      .setTimestamp()
      .setFooter({ text: `Abierto por ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
  },
};
