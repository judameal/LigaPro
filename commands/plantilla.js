const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

const { EQUIPOS, leerDB, tiempoRelativo } = require('./fichar');

const DT_ROLE_ID     = '1497693671141671034';
const SUB_DT_ROLE_ID = '1497693705539424467';

// Colores por equipo (primario, secundario)
const COLORES_EQUIPO = {
  '1497694196205879326': { primario: '#FFD700', secundario: '#e92828', texto: '#18160a' }, // Aucas
  '1497694246189273279': { primario: '#FFD700', secundario: '#1a1a1a', texto: '#FFD700' }, // Barcelona SC
  '1497694298270073013': { primario: '#C8102E', secundario: '#141313', texto: '#FFFFFF' }, // Deportivo Cuenca
  '1497694271740838058': { primario: '#00529B', secundario: '#d5d810', texto: '#FFFFFF' }, // Delfín
  '1497694379304026152': { primario: '#003087', secundario: '#5c5b55', texto: '#f8f7f1' }, // Emelec
  '1497694414586511440': { primario: '#0d0c0e', secundario: '#2d1d69', texto: '#FFFFFF' }, // IDV
  '1497797471483723817': { primario: '#d83417', secundario: '#0a0a09', texto: '#f0f0f0' }, // Leones del Norte
  '1497694479992492243': { primario: '#e6800c', secundario: '#0c0b0b', texto: '#FFFFFF' }, // Libertad
  '1497694498590031872': { primario: '#fdfdff', secundario: '#FFFFFF', texto: '#2a1e97' }, // Liga de Quito
  '1497694538523742430': { primario: '#0c6aa0', secundario: '#0c6aa0', texto: '#FFFFFF' }, // Macará
  '1497694562683060255': { primario: '#00529B', secundario: '#FFFFFF', texto: '#FFFFFF' }, // Manta
  '1497694576738304061': { primario: '#04692e', secundario: '#867f1d', texto: '#FFFFFF' }, // Mushuc Runa
  '1497694629758505060': { primario: '#0b6303', secundario: '#92902b', texto: '#ffffff' }, // Orense
  '1497694651589722203': { primario: '#e00d31', secundario: '#ffffff', texto: '#000000' }, // Técnico Universitario
  '1497694729792393216': { primario: '#437ab9', secundario: '#FFFFFF', texto: '#FFFFFF' }, // U. Católica
  '1497695403158671571': { primario: '#65afd1', secundario: '#ffffff', texto: 'rgb(255, 255, 255)' }, // Guayaquil City
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plantilla')
    .setDescription('Muestra la plantilla completa de un equipo')
    .addRoleOption(opt =>
      opt.setName('equipo').setDescription('El equipo a consultar').setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const equipoRol  = interaction.options.getRole('equipo');
    const guild      = interaction.guild;
    const equipoInfo = EQUIPOS[equipoRol.id];

    if (!equipoInfo) {
      return interaction.editReply({ content: '❌ Ese rol no es un equipo válido de la liga.' });
    }

    await guild.members.fetch();

    const miembros = guild.members.cache.filter(
      m => m.roles.cache.has(equipoRol.id) && !m.user.bot
    );

    if (miembros.size === 0) {
      return interaction.editReply({
        content: `📋 El equipo **${equipoInfo.nombre}** no tiene jugadores registrados.`,
      });
    }

    const db = leerDB();

    let dtMiembro    = null;
    let subdtMiembro = null;
    const jugadores  = [];

    for (const [, miembro] of miembros) {
      const esDT    = miembro.roles.cache.has(DT_ROLE_ID);
      const esSubDT = miembro.roles.cache.has(SUB_DT_ROLE_ID);

      if (esDT)    dtMiembro    = miembro;
      if (esSubDT) subdtMiembro = miembro;

      // No incluir DT ni SUB-DT en la lista de jugadores
      if (esDT || esSubDT) continue;

      const datos  = db.jugadores[miembro.id];
      const tiempo = datos ? tiempoRelativo(datos.fechaFichaje) : 'hace tiempo';

      jugadores.push({ miembro, tiempo });
    }

    // Ordenar jugadores por fecha de fichaje (más antiguo primero)
    jugadores.sort((a, b) => {
      const fa = db.jugadores[a.miembro.id]?.fechaFichaje ?? 0;
      const fb = db.jugadores[b.miembro.id]?.fechaFichaje ?? 0;
      return fa - fb;
    });

    const color = COLORES_EQUIPO[equipoRol.id] ?? 0xFFD700;
    const total = jugadores.length + (dtMiembro ? 1 : 0) + (subdtMiembro ? 1 : 0);

    // ── Embed principal con logo del equipo ──
    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: 'Liga Ecuador · Plantilla Oficial',
        iconURL: 'https://flagcdn.com/w40/ec.png',
      })
      .setTitle(`${equipoInfo.nombre}`)
      .setThumbnail(equipoInfo.logo)
      .setDescription(`**${total}/15** jugadores en plantilla`)
      .setTimestamp()
      .setFooter({ text: 'Los tiempos se actualizan en cada consulta' });

    // ── Sección cuerpo técnico ──
    if (dtMiembro || subdtMiembro) {
      embed.addFields({ name: '━━━━━━  CUERPO TÉCNICO  ━━━━━━', value: '\u200B', inline: false });

      if (dtMiembro) {
        const datosDT = db.jugadores[dtMiembro.id];
        const tiempoDT = datosDT ? tiempoRelativo(datosDT.fechaFichaje) : 'hace tiempo';
        embed.addFields({
          name: '🏅 Director Técnico',
          value: `${dtMiembro}\n\`${dtMiembro.user.tag}\`\n*Fichado ${tiempoDT}*`,
          inline: true,
        });
      }

      if (subdtMiembro) {
        const datosSDT = db.jugadores[subdtMiembro.id];
        const tiempoSDT = datosSDT ? tiempoRelativo(datosSDT.fechaFichaje) : 'hace tiempo';
        embed.addFields({
          name: '🎖️ Sub-Director Técnico',
          value: `${subdtMiembro}\n\`${subdtMiembro.user.tag}\`\n*Fichado ${tiempoSDT}*`,
          inline: true,
        });
      }
    }

    // ── Sección jugadores ──
    if (jugadores.length > 0) {
      embed.addFields({ name: '━━━━━━━  JUGADORES  ━━━━━━━', value: '\u200B', inline: false });

      for (const j of jugadores) {
        embed.addFields({
          name: j.miembro.displayName,
          value: `${j.miembro}\n\`${j.miembro.user.tag}\`\n*Fichado ${j.tiempo}*`,
          inline: true,
        });
      }

      // Rellenar para que la última fila quede alineada (Discord hace columnas de 3)
      const resto = jugadores.length % 3;
      if (resto === 1) {
        embed.addFields(
          { name: '\u200B', value: '\u200B', inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
        );
      } else if (resto === 2) {
        embed.addFields({ name: '\u200B', value: '\u200B', inline: true });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  },
};