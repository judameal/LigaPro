const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
  '1497695403158671571': { primario: '#65afd1', secundario: '#ffffff', texto: '#ffffff' }, // Guayaquil City
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plantilla')
    .setDescription('Muestra la plantilla completa de un equipo')
    .addRoleOption(opt =>
      opt.setName('equipo').setDescription('El equipo a consultar').setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const equipoRol  = interaction.options.getRole('equipo');
      const guild      = interaction.guild;
      const equipoInfo = EQUIPOS[equipoRol.id];

      if (!equipoInfo) {
        return interaction.editReply({ content: '❌ **Error:** Ese rol no es un equipo válido de la liga.' });
      }

      // Fetch solo para garantizar que tengamos los miembros en caché
      try {
        await guild.members.fetch();
      } catch (fetchError) {
        console.error("Error al obtener los miembros del servidor:", fetchError);
        return interaction.editReply({ content: '⚠️ **Error:** No se pudieron obtener los miembros del servidor. Inténtalo de nuevo más tarde.' });
      }

      const miembros = guild.members.cache.filter(
        m => m.roles.cache.has(equipoRol.id) && !m.user.bot
      );

      if (miembros.size === 0) {
        return interaction.editReply({
          content: `📋 El equipo **${equipoInfo.nombre}** no tiene jugadores registrados actualmente.`,
        });
      }

      let db;
      try {
        db = leerDB();
      } catch (dbError) {
        console.error("Error al leer la base de datos:", dbError);
        return interaction.editReply({ content: '💾 **Error:** Hubo un problema al acceder a la base de datos de los jugadores.' });
      }

      let dtMiembro    = null;
      let subdtMiembro = null;
      const jugadores  = [];

      for (const [, miembro] of miembros) {
        const esDT    = miembro.roles.cache.has(DT_ROLE_ID);
        const esSubDT = miembro.roles.cache.has(SUB_DT_ROLE_ID);

        if (esDT) {
          dtMiembro = miembro;
          continue;
        }
        if (esSubDT) {
          subdtMiembro = miembro;
          continue;
        }

        const datos  = db.jugadores && db.jugadores[miembro.id] ? db.jugadores[miembro.id] : null;
        const tiempo = datos ? tiempoRelativo(datos.fechaFichaje) : 'Desconocido / Sin ficha';

        jugadores.push({ miembro, tiempo });
      }

      // Ordenar jugadores por fecha de fichaje (más antiguo primero)
      jugadores.sort((a, b) => {
        const fa = (db.jugadores && db.jugadores[a.miembro.id]?.fechaFichaje) || 0;
        const fb = (db.jugadores && db.jugadores[b.miembro.id]?.fechaFichaje) || 0;
        return fa - fb;
      });

      // El error principal: color era un objeto de COLORES_EQUIPO, no un color hexadecimal válido.
      const colorData = COLORES_EQUIPO[equipoRol.id];
      const colorEmbed = colorData && colorData.primario ? colorData.primario : '#FFD700';

      const totalJugadores = jugadores.length + (dtMiembro ? 1 : 0) + (subdtMiembro ? 1 : 0);

      // ── Embed principal con logo del equipo ──
      const embed = new EmbedBuilder()
        .setColor(colorEmbed)
        .setAuthor({
          name: 'Liga Ecuador · Plantilla Oficial',
          iconURL: 'https://flagcdn.com/w40/ec.png',
        })
        .setTitle(`${equipoInfo.nombre}`)
        .setThumbnail(equipoInfo.logo || null) // Evitar fallo si no hay logo
        .setDescription(`**${totalJugadores}/15** jugadores en plantilla`)
        .setTimestamp()
        .setFooter({ text: 'Los tiempos se actualizan en cada consulta' });

      // Verificar límite de campos (máximo 25 por Embed de Discord)
      let camposAgregados = 0;

      // ── Sección cuerpo técnico ──
      if (dtMiembro || subdtMiembro) {
        embed.addFields({ name: '━━━━━━  CUERPO TÉCNICO  ━━━━━━', value: '\u200B', inline: false });
        camposAgregados++;

        if (dtMiembro) {
          const datosDT = db.jugadores && db.jugadores[dtMiembro.id] ? db.jugadores[dtMiembro.id] : null;
          const tiempoDT = datosDT ? tiempoRelativo(datosDT.fechaFichaje) : 'Desconocido / Sin ficha';
          embed.addFields({
            name: '🏅 Director Técnico',
            value: `${dtMiembro}\n\`${dtMiembro.user.tag}\`\n*Fichado ${tiempoDT}*`,
            inline: true,
          });
          camposAgregados++;
        }

        if (subdtMiembro) {
          const datosSDT = db.jugadores && db.jugadores[subdtMiembro.id] ? db.jugadores[subdtMiembro.id] : null;
          const tiempoSDT = datosSDT ? tiempoRelativo(datosSDT.fechaFichaje) : 'Desconocido / Sin ficha';
          embed.addFields({
            name: '🎖️ Sub-Director Técnico',
            value: `${subdtMiembro}\n\`${subdtMiembro.user.tag}\`\n*Fichado ${tiempoSDT}*`,
            inline: true,
          });
          camposAgregados++;
        }
      }

      // ── Sección jugadores ──
      if (jugadores.length > 0) {
        if (camposAgregados < 25) {
          embed.addFields({ name: '━━━━━━━  JUGADORES  ━━━━━━━', value: '\u200B', inline: false });
          camposAgregados++;
        }

        for (const j of jugadores) {
          if (camposAgregados >= 24) { // Límite para evitar crasheos (25 max)
            embed.addFields({ name: '⚠️ Límite alcanzado', value: 'Hay más jugadores, pero el panel está lleno.', inline: false });
            break; 
          }
          embed.addFields({
            name: j.miembro.displayName,
            value: `${j.miembro}\n\`${j.miembro.user.tag}\`\n*Fichado ${j.tiempo}*`,
            inline: true,
          });
          camposAgregados++;
        }

        // Rellenar para que la última fila quede alineada (Discord hace columnas de 3)
        const resto = jugadores.length % 3;
        if (resto === 1 && camposAgregados < 24) {
          embed.addFields(
            { name: '\u200B', value: '\u200B', inline: true },
            { name: '\u200B', value: '\u200B', inline: true },
          );
        } else if (resto === 2 && camposAgregados < 25) {
          embed.addFields({ name: '\u200B', value: '\u200B', inline: true });
        }
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Error en comando plantilla:", error);
      try {
        const errorMsg = '❌ **Ocurrió un error inesperado al procesar la plantilla.**\nPor favor, intenta de nuevo o contacta a un administrador.';
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: errorMsg, embeds: [] });
        } else {
          await interaction.reply({ content: errorMsg, ephemeral: true });
        }
      } catch (e) {
        console.error("Error crítico al enviar mensaje de fallo:", e);
      }
    }
  },
};