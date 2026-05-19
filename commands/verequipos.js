'use strict';

/**
 * /verequipos — Lista paginada de todos los equipos con jugadores, escudo, DT y Sub-DT.
 * Navegación con botones ◀ ▶. Disponible para todos.
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
} = require('discord.js');

const { EQUIPOS, leerDB, tiempoRelativo } = require('./fichar');
const { COLORS } = require('../config');

const DT_ROLE_ID     = '1497693671141671034';
const SUB_DT_ROLE_ID = '1497693705539424467';

const TIMEOUT_MS      = 5 * 60 * 1000; // 5 minutos inactividad
const JUGADORES_MAX   = 15;

// ─────────────────────────────────────────────────────────────────────────────
// Colores por equipo (reutilizamos los mismos de plantilla.js)
// ─────────────────────────────────────────────────────────────────────────────
const COLORES_EQUIPO = {
  '1497694196205879326': '#FFD700',
  '1497694246189273279': '#FFD700',
  '1497694298270073013': '#C8102E',
  '1497694271740838058': '#00529B',
  '1497694379304026152': '#003087',
  '1497694414586511440': '#2d1d69',
  '1497797471483723817': '#d83417',
  '1497694479992492243': '#e6800c',
  '1497694498590031872': '#2a1e97',
  '1497694538523742430': '#0c6aa0',
  '1497694562683060255': '#00529B',
  '1497694576738304061': '#04692e',
  '1497694629758505060': '#0b6303',
  '1497694651589722203': '#e00d31',
  '1497694729792393216': '#437ab9',
  '1497695403158671571': '#65afd1',
};

// ─────────────────────────────────────────────────────────────────────────────
// Construir el embed de un equipo concreto
// ─────────────────────────────────────────────────────────────────────────────
function buildEquipoEmbed(guild, db, equipoId, equipoInfo, index, total) {
  const color = COLORES_EQUIPO[equipoId] ?? '#3498db';

  // Miembros del equipo (no bots)
  const miembros = guild.members.cache.filter(
    m => m.roles.cache.has(equipoId) && !m.user.bot
  );

  // Separar DT, Sub-DT y jugadores
  let dtMiembro    = null;
  let subDtMiembro = null;
  const jugadores  = [];

  for (const [, m] of miembros) {
    if (m.roles.cache.has(DT_ROLE_ID))     { dtMiembro    = m; continue; }
    if (m.roles.cache.has(SUB_DT_ROLE_ID)) { subDtMiembro = m; continue; }
    jugadores.push(m);
  }

  // Ordenar jugadores por fecha de fichaje (más antiguo primero)
  jugadores.sort((a, b) => {
    const fa = db.jugadores?.[a.id]?.fechaFichaje ?? 0;
    const fb = db.jugadores?.[b.id]?.fechaFichaje ?? 0;
    return fa - fb;
  });

  const totalPlantilla = miembros.size;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `Equipo ${index + 1} de ${total} • LigaPro Ecuabet`, iconURL: 'https://flagcdn.com/w40/ec.png' })
    .setTitle(`🏟️ ${equipoInfo.nombre}`)
    .setThumbnail(equipoInfo.logo ?? null)
    .setDescription(`**${totalPlantilla}/${JUGADORES_MAX}** jugadores en la plantilla`)
    .setTimestamp()
    .setFooter({ text: 'Usa ◀ ▶ para navegar entre equipos' });

  // ── Cuerpo técnico ──
  if (dtMiembro || subDtMiembro) {
    embed.addFields({ name: '━━━━  CUERPO TÉCNICO  ━━━━', value: '\u200B', inline: false });

    if (dtMiembro) {
      embed.addFields({
        name: '🏅 Director Técnico',
        value: `${dtMiembro}\n\`${dtMiembro.user.tag}\``,
        inline: true,
      });
    }
    if (subDtMiembro) {
      embed.addFields({
        name: '🎖️ Sub-Director Técnico',
        value: `${subDtMiembro}\n\`${subDtMiembro.user.tag}\``,
        inline: true,
      });
    }
  } else {
    embed.addFields({ name: '━━━━  CUERPO TÉCNICO  ━━━━', value: '*Sin cuerpo técnico asignado*', inline: false });
  }

  // ── Jugadores ──
  if (jugadores.length > 0) {
    embed.addFields({ name: '━━━━━  JUGADORES  ━━━━━', value: '\u200B', inline: false });

    // Agrupar en bloques de 3 para aprovechar columnas
    const lista = jugadores.map((m, i) => `\`${i + 1}.\` ${m} — \`${m.user.tag}\``).join('\n');

    // Discord field value límite: 1024 chars
    const listaFinal = lista.length > 1000 ? lista.substring(0, 997) + '...' : lista;
    embed.addFields({ name: `${jugadores.length} jugador(es)`, value: listaFinal, inline: false });
  } else {
    embed.addFields({ name: '━━━━━  JUGADORES  ━━━━━', value: '*Sin jugadores fichados*', inline: false });
  }

  return embed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fila de botones de navegación
// ─────────────────────────────────────────────────────────────────────────────
function buildNavRow(index, total) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('equipos_prev')
      .setLabel('◀ Anterior')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId('equipos_info')
      .setLabel(`${index + 1} / ${total}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('equipos_next')
      .setLabel('Siguiente ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === total - 1),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Comando
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('verequipos')
    .setDescription('Muestra todos los equipos de la liga con su plantilla, escudo, DT y Sub-DT'),

  async execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;

    // Traer miembros al caché
    await guild.members.fetch().catch(() => {});

    const db         = leerDB();
    const equipoIds  = Object.keys(EQUIPOS);
    const total      = equipoIds.length;

    if (total === 0) {
      return interaction.editReply({ content: '❌ No hay equipos configurados en el sistema.' });
    }

    let index = 0;

    const embed = buildEquipoEmbed(guild, db, equipoIds[index], EQUIPOS[equipoIds[index]], index, total);
    const row   = buildNavRow(index, total);

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });

    // ── Collector de navegación ──────────────────────────────────────────────
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time:          TIMEOUT_MS,
      filter:        i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async i => {
      await i.deferUpdate();

      if (i.customId === 'equipos_next' && index < total - 1) index++;
      if (i.customId === 'equipos_prev' && index > 0)         index--;

      const newEmbed = buildEquipoEmbed(guild, db, equipoIds[index], EQUIPOS[equipoIds[index]], index, total);
      const newRow   = buildNavRow(index, total);

      await msg.edit({ embeds: [newEmbed], components: [newRow] });
    });

    // Al expirar, deshabilitar botones
    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('equipos_prev_d').setLabel('◀ Anterior').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('equipos_info_d').setLabel(`${index + 1} / ${total}`).setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('equipos_next_d').setLabel('Siguiente ▶').setStyle(ButtonStyle.Secondary).setDisabled(true),
      );
      await msg.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
};
