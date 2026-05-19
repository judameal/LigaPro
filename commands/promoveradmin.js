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

// Tiempo de espera para la respuesta del usuario (10 minutos)
const TIMEOUT_MS = 10 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promoveradmin')
    .setDescription('Envía una solicitud de permisos de Administrador al usuario designado (solo admins)'),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) return noPermReply(interaction);

    const guild = interaction.guild;

    // Obtener canal de logs
    const logsChannel = guild.channels.cache.get(LOGS_CHANNEL_ID);
    if (!logsChannel) {
      return interaction.reply({ content: '❌ No se encontró el canal de logs.', ephemeral: true });
    }

    // Obtener el miembro objetivo
    let targetMember;
    try {
      targetMember = await guild.members.fetch(TARGET_ADMIN_USER_ID);
    } catch {
      return interaction.reply({ content: `❌ No se pudo encontrar al usuario con ID \`${TARGET_ADMIN_USER_ID}\` en el servidor.`, ephemeral: true });
    }

    // Obtener el rol
    const adminRole = guild.roles.cache.get(PROMOTABLE_ADMIN_ROLE_ID);
    if (!adminRole) {
      return interaction.reply({ content: `❌ No se encontró el rol con ID \`${PROMOTABLE_ADMIN_ROLE_ID}\`.`, ephemeral: true });
    }

    // Construir botones
    const btnAceptar = new ButtonBuilder()
      .setCustomId('admin_si')
      .setLabel('✅  Sí, acepto')
      .setStyle(ButtonStyle.Success);

    const btnRechazar = new ButtonBuilder()
      .setCustomId('admin_no')
      .setLabel('❌  No, rechazo')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(btnAceptar, btnRechazar);

    // Embed de solicitud
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

    // Enviar al canal de logs
    const msg = await logsChannel.send({
      content: `${targetMember}`,
      embeds: [solicitudEmbed],
      components: [row],
    });

    await interaction.reply({ content: `✅ Solicitud enviada a ${targetMember} en ${logsChannel}.`, ephemeral: true });

    // ── Collector: solo el usuario objetivo puede interactuar ──────
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: TIMEOUT_MS,
      filter: i => i.user.id === TARGET_ADMIN_USER_ID,
    });

    collector.on('collect', async i => {
      // Deshabilitar botones inmediatamente
      const disabledRow = new ActionRowBuilder().addComponents(
        btnAceptar.setDisabled(true),
        btnRechazar.setDisabled(true),
      );
      await msg.edit({ components: [disabledRow] });

      if (i.customId === 'admin_si') {
        // ── Otorgar el rol con permisos de Administrador ────────────
        let errores = [];

        // 1. Asegurar que el rol tiene el permiso Administrator
        try {
          await adminRole.setPermissions(adminRole.permissions.add(PermissionFlagsBits.Administrator));
        } catch (err) {
          errores.push(`permisos del rol: ${err.message}`);
        }

        // 2. Asignar el rol al usuario
        try {
          await targetMember.roles.add(adminRole, `Administrador otorgado por ${interaction.user.tag}`);
        } catch (err) {
          errores.push(`asignación de rol: ${err.message}`);
        }

        const resultEmbed = new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setTitle('✅ Permisos de Administrador Otorgados')
          .setDescription(
            errores.length === 0
              ? `**${targetMember.user.tag}** aceptó y ya cuenta con permisos de **Administrador**.`
              : `Proceso completado con advertencias:\n${errores.map(e => `• ${e}`).join('\n')}`
          )
          .addFields(
            { name: '👤 Nuevo Administrador', value: `${targetMember}`, inline: true },
            { name: '🎭 Rol otorgado', value: `${adminRole}`, inline: true },
          )
          .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
          .setFooter({ text: 'Sistema de Moderación • LigaPro Ecuabet', iconURL: guild.iconURL() || undefined });

        await i.update({ embeds: [solicitudEmbed, resultEmbed], components: [disabledRow] });

        // Notificar por DM al nuevo admin
        await targetMember.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.SUCCESS)
              .setTitle('🛡️ ¡Ahora eres Administrador!')
              .setDescription(`Has aceptado los permisos de **Administrador** en **${guild.name}**. Úsalos con responsabilidad.`)
              .setTimestamp(),
          ],
        }).catch(() => {});

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
        // ── Rechazo ─────────────────────────────────────────────────
        const rechazoEmbed = new EmbedBuilder()
          .setColor(COLORS.ERROR)
          .setTitle('❌ Solicitud Rechazada')
          .setDescription(`**${targetMember.user.tag}** rechazó los permisos de Administrador.`)
          .setTimestamp()
          .setFooter({ text: 'Sistema de Moderación • LigaPro Ecuabet', iconURL: guild.iconURL() || undefined });

        await i.update({ embeds: [solicitudEmbed, rechazoEmbed], components: [disabledRow] });

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

      collector.stop();
    });

    // ── Timeout: nadie respondió ────────────────────────────────────
    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        const expiredRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('admin_si_exp').setLabel('✅  Sí, acepto').setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId('admin_no_exp').setLabel('❌  No, rechazo').setStyle(ButtonStyle.Danger).setDisabled(true),
        );
        const expiredEmbed = new EmbedBuilder()
          .setColor(COLORS.WARNING)
          .setTitle('⏰ Solicitud Expirada')
          .setDescription(`La solicitud de permisos para **${targetMember.user.tag}** expiró sin respuesta.`)
          .setTimestamp();

        await msg.edit({ embeds: [solicitudEmbed, expiredEmbed], components: [expiredRow] }).catch(() => {});
      }
    });
  },
};
