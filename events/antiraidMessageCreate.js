/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   🔍 ANTIRAID — Detector de Mensajes | LigaPro Ecuabet x4  ║
 * ║   VAR Digital: Anti-Spam · Anti-Links · Anti-Menciones      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const {
  isWhitelisted, track, raidLog, autotimeout, autokick,
  spamTracker, linkTracker, mentionTracker,
  THRESHOLDS, AR_COLORS, LINK_REGEX, activateLockdown, raidState,
} = require('../utils/antiraid');



module.exports = {
  name: 'messageCreate',

  async execute(message, client) {
    // ── Ignorar bots / DMs / mensajes del sistema ──────────────
    if (message.author.bot || !message.guild || message.system) return;

    const member = message.member;
    const guild  = message.guild;

    // ── Whitelist: admins no son castigados ────────────────────
    if (isWhitelisted(member, guild)) return;

    // ══════════════════════════════════════════════════
    //  1. DETECCIÓN DE SPAM DE MENSAJES
    // ══════════════════════════════════════════════════
    const spamCount = track(spamTracker, message.author.id, THRESHOLDS.SPAM_MSG_WINDOW);

    if (spamCount >= THRESHOLDS.SPAM_MSG_COUNT) {
      // Eliminar el mensaje infractor
      await message.delete().catch(() => {});

      // Aplicar timeout (10 min)
      await autotimeout(member, 'Spam masivo de mensajes detectado', 10 * 60 * 1000);

      await raidLog(guild, {
        title: 'SPAM DE MENSAJES DETECTADO',
        description:
          `🚨 **VAR DE SEGURIDAD:** Se detectó spam sospechoso en el estadio.\n\n` +
          `**${message.author.tag}** ha superado el límite de mensajes en poco tiempo.\n` +
          `⚠️ **COMISIÓN DISCIPLINARIA:** Se ha aplicado silencio temporal de 10 minutos.`,
        color: AR_COLORS.WARNING,
        userId: message.author.id,
        fields: [
          { name: '📨 Mensajes detectados', value: `${spamCount} en 5 segundos`, inline: true },
          { name: '👤 Usuario', value: `${message.author.tag}`, inline: true },
          { name: '📍 Canal', value: `${message.channel}`, inline: true },
          { name: '🕐 Sanción', value: 'Timeout 10 minutos', inline: true },
        ]
      });

      // Si el spam es extremo, elevar alerta
      if (spamCount >= THRESHOLDS.SPAM_MSG_COUNT * 3) {
        await activateLockdown(guild, `Spam extremo por usuario ${message.author.tag}`);
      }
      return;
    }

    // ══════════════════════════════════════════════════
    //  2. DETECCIÓN DE LINKS EXTERNOS
    // ══════════════════════════════════════════════════
    if (LINK_REGEX.test(message.content)) {
      const linkCount = track(linkTracker, message.author.id, THRESHOLDS.LINK_WINDOW);

      // Eliminar mensaje con link
      await message.delete().catch(() => {});

      if (linkCount >= THRESHOLDS.LINK_COUNT) {
        // Reincidente → kick
        await autokick(member, 'Publicación masiva de links externos no autorizados');

        await raidLog(guild, {
          title: 'LINK EXTERNO BLOQUEADO — EXPULSIÓN',
          description:
            `⚠️ **COMISIÓN DISCIPLINARIA:** Los links externos no están permitidos en el estadio.\n\n` +
            `**${message.author.tag}** fue reincidente (${linkCount} links) y ha sido expulsado.\n` +
            `🟨 **TARJETA ROJA POR REINCIDENCIA.**`,
          color: AR_COLORS.BAN,
          userId: message.author.id,
          fields: [
            { name: '🔗 Links detectados', value: `${linkCount}`, inline: true },
            { name: '👤 Usuario', value: message.author.tag, inline: true },
            { name: '🕐 Sanción', value: 'Expulsión del servidor', inline: true },
          ]
        });
      } else {
        // ── Link eliminado en silencio → log privado al canal de logs ──
        await raidLog(guild, {
          title: 'LINK EXTERNO ELIMINADO',
          description:
            `⚠️ **COMISIÓN DISCIPLINARIA:** Link externo detectado y eliminado.\n` +
            `**${message.author.tag}** intentó publicar un enlace no autorizado.`,
          color: AR_COLORS.SUSPICIOUS,
          userId: message.author.id,
          fields: [
            { name: '📍 Canal', value: `${message.channel}`, inline: true },
            { name: '⚠️ Advertencias', value: `${linkCount}/${THRESHOLDS.LINK_COUNT}`, inline: true },
          ]
        });
      }
      return;
    }

    // ══════════════════════════════════════════════════
    //  3. DETECCIÓN DE MENCIONES MASIVAS
    // ══════════════════════════════════════════════════
    const totalMentions = message.mentions.users.size + message.mentions.roles.size;
    if (totalMentions >= THRESHOLDS.MENTION_COUNT) {
      const mentionCount = track(mentionTracker, message.author.id, THRESHOLDS.MENTION_WINDOW);

      await message.delete().catch(() => {});
      await autotimeout(member, 'Ping masivo a usuarios/roles', 15 * 60 * 1000);

      await raidLog(guild, {
        title: 'PING MASIVO DETECTADO',
        description:
          `🚨 **VAR DE SEGURIDAD:** Actividad sospechosa en el estadio.\n\n` +
          `**${message.author.tag}** realizó un ping masivo (${totalMentions} menciones).\n` +
          `🟥 **TARJETA ROJA:** Silencio temporal de 15 minutos aplicado.`,
        color: AR_COLORS.BAN,
        userId: message.author.id,
        fields: [
          { name: '📢 Menciones', value: `${totalMentions}`, inline: true },
          { name: '👤 Usuario', value: message.author.tag, inline: true },
          { name: '📍 Canal', value: `${message.channel}`, inline: true },
          { name: '🕐 Sanción', value: 'Timeout 15 minutos', inline: true },
        ]
      });
    }
  },
};
