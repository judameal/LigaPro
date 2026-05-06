const { EmbedBuilder } = require('discord.js');
const { LOGS_CHANNEL_ID, COLORS } = require('../config');

/**
 * Función universal para enviar logs a un canal específico
 * @param {import('discord.js').Guild} guild El servidor (guild) de Discord
 * @param {Object} options Opciones del log
 * @param {string} options.title Título del embed
 * @param {string} options.description Descripción detallada
 * @param {number} [options.color] Color del embed (por defecto INFO)
 * @param {Array<{name: string, value: string, inline?: boolean}>} [options.fields] Campos extra
 * @param {string} [options.thumbnail] URL para el thumbnail
 */
async function sendLog(guild, { title, description, color = COLORS.INFO, fields = [], thumbnail = null }) {
  try {
    if (!guild) return;

    const logsChannel = guild.channels.cache.get(LOGS_CHANNEL_ID);
    if (!logsChannel) {
      console.error(`[LOGGER] No se encontró el canal de logs con ID: ${LOGS_CHANNEL_ID}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 Log: ${title}`)
      .setDescription(description)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: 'Sistema de Moderación y Logs • LigaPro Ecuabet', iconURL: guild.iconURL() || undefined });

    if (fields.length > 0) {
      embed.addFields(fields);
    }

    if (thumbnail) {
      embed.setThumbnail(thumbnail);
    }

    await logsChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[LOGGER] Error al enviar log:', error);
  }
}

module.exports = { sendLog };
