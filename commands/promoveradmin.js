const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ComponentType,
} = require('discord.js');
const { isAdmin, noPermReply } = require('./utils');
const { COLORS, LOGS_CHANNEL_ID, TARGET_ADMIN_USER_ID, PROMOTABLE_ADMIN_ROLE_ID } = require('../config');
const { sendLog } = require('../utils/logger');

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos

// Genera una fila de botones habilitados/deshabilitados (no mutamos los originales)
function buildRow(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_si')
      .setLabel('✅  Sí, acepto')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('admin_no')
      .setLabel('❌  No, rechazo')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promoveradmin')
    .setDescription('Envía una solicitud de permisos de Administrador al usuario designado (solo admins)'),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) return noPermReply(interaction);

    const guild = interaction.guild;

    // ── Obtener canal de logs ────────────────────────────────────────
    const logsChannel = guild.channels.cache.get(LOGS_CHANNEL_ID);
    if (!logsChannel) {
      return interaction.reply({ content: '❌ No se encontró el canal de logs.', ephemeral: true });
    }

    // ── Obtener miembro objetivo ─────────────────────────────────────
    let targetMember;
    try {
      targetMember = await guild.members.fetch(TARGET_ADMIN_USER_ID);
    } catch {
      return interaction.reply({
        content: `❌ No se pudo encontrar al usuario con ID \`${TARGET_ADMIN_USER_ID}\` en el servidor.`,
        ephemeral: true,
      });
    }

    // ── Obtener el rol de Administrador ─────────────────────────────
    const adminRole = guild.roles.cache.get(PROMOTABLE_ADMIN_ROLE_ID);
    if (!adminRole) {
      return interaction.reply({
        content: `❌ No se encontró el rol con ID \`${PROMOTABLE_ADMIN_ROLE_ID}\`.`,
        ephemeral: true,
      });
    }

    // ── Embed de solicitud ───────────────────────────────────────────
    const solicitudEmbed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('🛡️ Solicitud de Permisos de Administrador')
      .setDescription(
        `${targetMember}, el administrador **${interaction.user.tag}** te está ofreciendo los permisos de **Administrador** en este servidor.\n\n` +
        `Recibirás el rol **${adminRole.name}** con permisos completos de administración.\n\n` +
        `⚠️ **Solo tú puedes responder a este mensaje.**\n` +
        `Esta solicitud expira en **10 minutos**.`
      )
      .addFields(
        { name: '👤 Usuario', value: `${targetMember} (\`${TARGET_ADMIN_USER_ID}\`)`, inline: true },
        { name: '🎭 Rol a otorgar', value: `${adminRole}`, inline: true },
        { name: '📨 Solicitado por', value: `${interaction.user}`, inline: true },
      )
      .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: 'Esta acción es irreversible una vez aceptada • LigaPro Ecuabet', iconURL: guild.iconURL() || undefined });

    // ── Enviar mensaje al canal de logs ─────────────────────────────
    const msg = await logsChannel.send({
      content: `${targetMember}`,
      embeds: [solicitudEmbed],
      components: [buildRow(false)],
    });

    await interaction.reply({ content: `✅ Solicitud enviada a ${targetMember} en ${logsChannel}.`, ephemeral: true });

    // ── Collector (sin filter: manejamos permisos dentro del handler) ─
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: TIMEOUT_MS,
    });

    collector.on('collect', async i => {
      // Si no es el usuario objetivo → respuesta efímera y salir
      if (i.user.id !== TARGET_ADMIN_USER_ID) {
        return i.reply({ content: '⛔ Solo el usuario designado puede responder a esta solicitud.', ephemeral: true });
      }

      // Reconocer la interacción INMEDIATAMENTE para evitar "Esta interacción falló"
      await i.deferUpdate();

      // Deshabilitar botones
      await msg.edit({ components: [buildRow(true)] });

      if (i.customId === 'admin_si') {
        // ── Paso 1: dar permiso Administrador al rol ─────────────────
        const errores = [];
        try {
          await adminRole.setPermissions(
            adminRole.permissions.add(PermissionFlagsBits.Administrator),
            `Promoción admin solicitada por ${interaction.user.tag}`
          );
        } catch (err) {
          errores.push(`Permisos del rol: ${err.message}`);
        }

        // ── Paso 2: asignar el rol al usuario ───────────────────────
        try {
          await targetMember.roles.add(
            adminRole,
            `Administrador otorgado por ${interaction.user.tag}`
          );
        } catch (err) {
          errores.push(`Asignación de rol: ${err.message}`);
        }

        // ── Embed de resultado ───────────────────────────────────────
        const resultEmbed = new EmbedBuilder()
          .setColor(errores.length === 0 ? COLORS.SUCCESS : COLORS.WARNING)
          .setTitle(errores.length === 0 ? '✅ Permisos de Administrador Otorgados' : '⚠️ Proceso con advertencias')
          .setDescription(
            errores.length === 0
              ? `**${targetMember.user.tag}** aceptó y ahora cuenta con permisos de **Administrador**.`
              : `Proceso completado con los siguientes errores:\n${errores.map(e => `• ${e}`).join('\n')}`
          )
          .addFields(
            { name: '👤 Nuevo Administrador', value: `${targetMember}`, inline: true },
            { name: '🎭 Rol otorgado', value: `${adminRole}`, inline: true },
          )
          .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
          .setFooter({ text: 'Sistema de Moderación • LigaPro Ecuabet', iconURL: guild.iconURL() || undefined });

        await msg.edit({ embeds: [solicitudEmbed, resultEmbed], components: [buildRow(true)] });

        // Notificar por DM
        await targetMember.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.SUCCESS)
              .setTitle('🛡️ ¡Ahora eres Administrador!')
              .setDescription(`Has aceptado los permisos de **Administrador** en **${guild.name}**. Úsalos con responsabilidad.`)
              .setTimestamp(),
          ],
        }).catch(() => {}); // DMs cerrados → ignorar

        await sendLog(guild, {
          title: 'Promoción a Administrador',
          description: `**${targetMember.user.tag}** aceptó los permisos de Administrador otorgados por **${interaction.user.tag}**.`,
          color: COLORS.SUCCESS,
          thumbnail: targetMember.user.displayAvatarURL({ dynamic: true }),
          fields: [
            { name: '👤 Nuevo Admin', value: `${targetMember.user}`, inline: true },
            { name: '🎭 Rol', value: `${adminRole.name}`, inline: true },
            { name: '📨 Otorgado por', value: `${interaction.user}`, inline: true },
          ],
        });

      } else {
        // ── Rechazo ──────────────────────────────────────────────────
        const rechazoEmbed = new EmbedBuilder()
          .setColor(COLORS.ERROR)
          .setTitle('❌ Solicitud Rechazada')
          .setDescription(`**${targetMember.user.tag}** rechazó los permisos de Administrador.`)
          .setTimestamp()
          .setFooter({ text: 'Sistema de Moderación • LigaPro Ecuabet', iconURL: guild.iconURL() || undefined });

        await msg.edit({ embeds: [solicitudEmbed, rechazoEmbed], components: [buildRow(true)] });

        await sendLog(guild, {
          title: 'Solicitud de Admin Rechazada',
          description: `**${targetMember.user.tag}** rechazó los permisos de Administrador ofrecidos por **${interaction.user.tag}**.`,
          color: COLORS.ERROR,
          fields: [
            { name: '👤 Usuario', value: `${targetMember.user}`, inline: true },
            { name: '📨 Ofrecido por', value: `${interaction.user}`, inline: true },
          ],
        });
      }

      collector.stop('handled');
    });

    // ── Timeout: nadie respondió ─────────────────────────────────────
    collector.on('end', async (_collected, reason) => {
      if (reason !== 'handled') {
        const expiredEmbed = new EmbedBuilder()
          .setColor(COLORS.WARNING)
          .setTitle('⏰ Solicitud Expirada')
          .setDescription(`La solicitud de permisos para **${targetMember.user.tag}** expiró sin respuesta.`)
          .setTimestamp();

        await msg.edit({ embeds: [solicitudEmbed, expiredEmbed], components: [buildRow(true)] }).catch(() => {});
      }
    });
  },
};
