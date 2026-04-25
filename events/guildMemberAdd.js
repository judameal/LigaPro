// events/guildMemberAdd.js
const { EmbedBuilder } = require('discord.js');
const { WELCOME_CHANNEL_ID, COLORS } = require('../config');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.WELCOME)
      .setTitle('👋 ¡Bienvenido al servidor!')
      .setDescription(
        `¡Hola ${member}! 🎉\n\nNos alegra tenerte aquí. Esperamos que disfrutes tu estancia.\n\n**¡Eres el miembro número ${member.guild.memberCount}!**`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Usuario', value: `${member.user.tag}`, inline: true },
        { name: '📅 Cuenta creada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setImage('https://i.imgur.com/your-banner.png') // Puedes cambiar esto por tu banner
      .setFooter({ text: `ID: ${member.user.id}` })
      .setTimestamp();

    channel.send({ content: `✨ ¡Bienvenido ${member}!`, embeds: [embed] });
  },
};
