const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');

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

// ─────────────────────────────────────────────
//  GENERA LA IMAGEN DE PLANTILLA
// ─────────────────────────────────────────────
async function generarImagenPlantilla({ equipoNombre, equipoLogo, colores, jugadores, dtNombre, subdtNombre }) {
  const W = 900;
  // Altura dinámica según jugadores
  const filas = Math.ceil(jugadores.length / 3);
  const H = 340 + filas * 100 + 60;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const { primario, secundario } = colores;

  // ── FONDO ──
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0,   secundario === '#FFFFFF' ? '#0d0d0d' : secundario);
  grad.addColorStop(1,   '#111111');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── BANDA SUPERIOR ──
  ctx.fillStyle = primario;
  ctx.fillRect(0, 0, W, 8);

  // ── LOGO DEL EQUIPO ──
  try {
    const logoImg = await loadImage(equipoLogo).catch(() => null);
    if (logoImg) {
      // Círculo de fondo para el logo
      ctx.save();
      ctx.beginPath();
      ctx.arc(100, 120, 70, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.clip();
      ctx.drawImage(logoImg, 30, 50, 140, 140);
      ctx.restore();
    }
  } catch (_) {}

  // ── NOMBRE DEL EQUIPO ──
  ctx.font = 'bold 42px "Arial"';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(equipoNombre.toUpperCase(), 190, 100);

  // ── LINEA DECORATIVA ──
  ctx.fillStyle = primario;
  ctx.fillRect(190, 110, 400, 4);

  // ── DT / SUB-DT ──
  ctx.font = 'bold 18px "Arial"';
  ctx.fillStyle = primario;
  ctx.fillText('🧑‍💼 DIRECTOR TÉCNICO', 190, 145);
  ctx.font = '17px "Arial"';
  ctx.fillStyle = '#CCCCCC';
  ctx.fillText(dtNombre || 'Sin asignar', 190, 168);

  if (subdtNombre) {
    ctx.font = 'bold 16px "Arial"';
    ctx.fillStyle = primario;
    ctx.fillText('🧑‍💼 SUB-DIRECTOR TÉCNICO', 460, 145);
    ctx.font = '16px "Arial"';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(subdtNombre, 460, 168);
  }

  // ── CONTADOR JUGADORES ──
  ctx.font = 'bold 15px "Arial"';
  ctx.fillStyle = '#888888';
  ctx.fillText(`PLANTILLA — ${jugadores.length}/15 JUGADORES`, 190, 205);

  // ── SEPARADOR ──
  ctx.fillStyle = '#333333';
  ctx.fillRect(20, 220, W - 40, 1);

  // ── TARJETAS DE JUGADORES ──
  const cardW  = 265;
  const cardH  = 80;
  const startX = 30;
  const startY = 240;
  const gap    = 20;

  for (let i = 0; i < jugadores.length; i++) {
    const col  = i % 3;
    const fila = Math.floor(i / 3);
    const x    = startX + col * (cardW + gap);
    const y    = startY + fila * (cardH + gap);

    // Fondo de la tarjeta
    ctx.fillStyle = '#1e1e1e';
    roundRect(ctx, x, y, cardW, cardH, 10);
    ctx.fill();

    // Borde izquierdo de color
    ctx.fillStyle = primario;
    ctx.fillRect(x, y, 4, cardH);

    // Número de dorsal
    ctx.font = 'bold 22px "Arial"';
    ctx.fillStyle = primario;
    ctx.fillText(`#${i + 1}`, x + 15, y + 30);

    // Nombre del jugador
    const nombre = jugadores[i].nombre.length > 18
      ? jugadores[i].nombre.slice(0, 16) + '…'
      : jugadores[i].nombre;
    ctx.font = 'bold 15px "Arial"';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(nombre, x + 55, y + 30);

    // Tiempo fichado
    ctx.font = '13px "Arial"';
    ctx.fillStyle = '#999999';
    ctx.fillText(`⏱ Fichado ${jugadores[i].tiempo}`, x + 55, y + 52);

    // Avatar circular (si tiene)
    if (jugadores[i].avatar) {
      try {
        const av = await loadImage(jugadores[i].avatar).catch(() => null);
        if (av) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x + cardW - 32, y + 20, 18, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(av, x + cardW - 50, y + 2, 36, 36);
          ctx.restore();
        }
      } catch (_) {}
    }
  }

  // ── PIE ──
  ctx.fillStyle = '#555555';
  ctx.font = '13px "Arial"';
  ctx.fillText(`Actualizado: ${new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 30, H - 18);

  ctx.fillStyle = primario;
  ctx.fillRect(0, H - 6, W, 6);

  return canvas.toBuffer('image/png');
}

// Helper: rect redondeado
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─────────────────────────────────────────────
//  COMANDO
// ─────────────────────────────────────────────
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

    // Obtener todos los miembros del servidor
    await guild.members.fetch();

    const miembros = guild.members.cache.filter(m => m.roles.cache.has(equipoRol.id) && !m.user.bot);

    if (miembros.size === 0) {
      return interaction.editReply({
        content: `📋 El equipo **${equipoInfo.nombre}** no tiene jugadores en este momento.`,
      });
    }

    // Separar DT, SUB-DT y jugadores
    let dtNombre    = null;
    let subdtNombre = null;
    const jugadores = [];

    const db = leerDB();

    for (const [, miembro] of miembros) {
      if (miembro.roles.cache.has(DT_ROLE_ID)) {
        dtNombre = miembro.displayName;
      } else if (miembro.roles.cache.has(SUB_DT_ROLE_ID)) {
        subdtNombre = miembro.displayName;
      }

      // Todos los del equipo van a la plantilla (incluyendo DT/SUB-DT)
      const datosFichaje = db.jugadores[miembro.id];
      const tiempo = datosFichaje ? tiempoRelativo(datosFichaje.fechaFichaje) : 'hace tiempo';

      jugadores.push({
        nombre: miembro.displayName,
        avatar: miembro.user.displayAvatarURL({ extension: 'png', size: 64 }),
        tiempo,
      });
    }

    const colores = COLORES_EQUIPO[equipoRol.id] || { primario: '#FFD700', secundario: '#111111' };

    // Generar imagen
    let imageBuffer;
    try {
      imageBuffer = await generarImagenPlantilla({
        equipoNombre: equipoInfo.nombre,
        equipoLogo:   equipoInfo.logo,
        colores,
        jugadores,
        dtNombre,
        subdtNombre,
      });
    } catch (err) {
      console.error('[PLANTILLA] Error generando imagen:', err);
      // Fallback: embed de texto
      const embed = new EmbedBuilder()
        .setTitle(`📋 Plantilla — ${equipoInfo.nombre}`)
        .setThumbnail(equipoInfo.logo)
        .setColor(parseInt(colores.primario.replace('#', ''), 16))
        .setDescription(jugadores.map((j, i) => `**#${i+1}** ${j.nombre} — ${j.tiempo}`).join('\n'))
        .addFields(
          { name: '🧑‍💼 Director Técnico',     value: dtNombre    || 'Sin asignar', inline: true },
          { name: '🧑‍💼 Sub-Director Técnico', value: subdtNombre || 'Sin asignar', inline: true },
          { name: '👥 Total',                  value: `${jugadores.length}/15`, inline: true },
        )
        .setTimestamp()
        .setFooter({ text: 'Liga Ecuador' });

      return interaction.editReply({ embeds: [embed] });
    }

    const attachment = new AttachmentBuilder(imageBuffer, { name: `plantilla-${equipoInfo.nombre.replace(/\s+/g, '-').toLowerCase()}.png` });

    const embed = new EmbedBuilder()
      .setTitle(`📋 ${equipoInfo.nombre} — Plantilla Oficial`)
      .setColor(parseInt(colores.primario.replace('#', ''), 16))
      .setImage(`attachment://plantilla-${equipoInfo.nombre.replace(/\s+/g, '-').toLowerCase()}.png`)
      .addFields(
        { name: '👥 Jugadores', value: `${jugadores.length}/15`, inline: true },
        { name: '🧑‍💼 Director Técnico', value: dtNombre || 'Sin asignar', inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Liga Ecuador · Los tiempos se actualizan en cada consulta' });

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  },
};