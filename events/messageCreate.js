const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ── CONFIGURACIÓN DE SALUDOS ──
// Puedes editar este array para agregar, quitar o modificar los saludos.
// La palabra {usuario} se reemplazará automáticamente por la mención del usuario.
const SALUDOS = [
  // Simples y amigables
  "¡Hola {usuario}! Qué alegría verte por aquí.",
  "¡Buenas {usuario}! Espero que estés teniendo un día excelente.",
  "¡Holi {usuario}! Bienvenido de vuelta al servidor.",
  "¡Un saludo enorme, {usuario}! Pásala genial.",
  "¡Qué tal {usuario}! ¿Todo bien por tu lado?",
  
  // Creativos
  "¡Abran paso, acaba de llegar {usuario}! 😎",
  "¡Detengan las prensas! {usuario} ha escrito en el chat. ¡Hola!",
  "¡Paren todo! Una leyenda acaba de saludar. ¡Bienvenido {usuario}! 🌟",
  "¡Bip bop! Mis sensores de buen rollo detectan a {usuario} en el chat. 🤖✨",
  "¡Alerta de persona genial! {usuario} ha llegado al servidor.",

  // Con rimas y bromas
  "¡Hola {usuario}, cara de bola! ⚽",
  "¡Buenas {usuario}, qué alegría que suenas! 🎵",
  "¡Holi {usuario}, comiendo ravioli! 🍝",
  "¡Wenas {usuario}, que la suerte te llueva a manos llenas! 🌧️💸",
  "¡Hola {usuario}, ojalá este servidor te encante y te mole! 🎉",
  "¡Hola {usuario}, que la pases re-piola! 🤙"
];

// Palabras clave para activar el saludo (insensible a mayúsculas/minúsculas).
// Usamos \b para indicar límites de palabra (no saltará si dice "caracola", solo si dice "ola").
const PALABRAS_CLAVE = /\b(oa|ola|hola|holi|wenas|holas)\b/i;

// Rutas de almacenamiento para la base de datos local
const DB_DIR = path.join(__dirname, '../data');
const DB_PATH = path.join(DB_DIR, 'saludados.json');

// Función para cargar los IDs de los usuarios que ya saludamos
function leerSaludados() {
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    if (!fs.existsSync(DB_PATH)) {
      // Si el archivo no existe, lo creamos con un array vacío
      fs.writeFileSync(DB_PATH, JSON.stringify([]));
      return new Set();
    }
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    return new Set(data);
  } catch (error) {
    console.error("[Saludos] Error al leer saludados.json:", error);
    return new Set();
  }
}

// Función para guardar a un usuario nuevo en la lista
function marcarSaludado(userId, saludadosSet) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(Array.from(saludadosSet), null, 2));
  } catch (error) {
    console.error("[Saludos] Error al guardar saludados.json:", error);
  }
}

// Cargamos la lista a la memoria para que el bot responda de forma ultra rápida
const saludados = leerSaludados();

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // 1. Evitamos que el bot se responda a sí mismo o a otros bots
    if (message.author.bot || message.system) return;

    // 2. Comprobamos si el mensaje contiene alguna de las palabras clave de saludo
    if (PALABRAS_CLAVE.test(message.content)) {
      
      // 3. Verificamos si este usuario ya fue saludado antes para evitar spam
      if (saludados.has(message.author.id)) return;

      // Lo agregamos inmediatamente al SET en memoria para prevenir que, 
      // si escribe muy rápido repetidas veces, no se envíen múltiples saludos a la vez.
      saludados.add(message.author.id);

      // Guardamos la memoria en el archivo de texto
      marcarSaludado(message.author.id, saludados);

      // 4. Seleccionamos un saludo al azar de la lista
      const saludoElegido = SALUDOS[Math.floor(Math.random() * SALUDOS.length)];
      const mensajeFinal = saludoElegido.replace('{usuario}', message.author.toString());

      // 5. Construimos un Embed bonito para la respuesta visual
      const embed = new EmbedBuilder()
        .setColor(0x00FF00) // Un verde amigable
        .setDescription(mensajeFinal)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: '¡Este saludo se autodestruirá en 5 minutos! 🕒' });

      try {
        // Enviamos el saludo respondiendo al mensaje original o al canal
        // En este caso lo enviamos directamente al canal para que el usuario lo vea
        const msg = await message.channel.send({ embeds: [embed] });

        // 6. Programamos la eliminación automática a los 5 minutos (300,000 ms)
        setTimeout(() => {
          // Asegurarnos de que el mensaje siga existiendo antes de borrarlo
          msg.delete().catch(() => {
            // Si el mensaje ya fue eliminado por un admin u otro motivo, no pasa nada
          });
        }, 5 * 60 * 1000);

      } catch (error) {
        console.error("[Saludos] Error al intentar enviar el embed de saludo:", error);
        // Si falló el envío (ej: bot sin permisos en ese canal), quitamos al usuario
        // de la lista para que pueda intentar ser saludado después.
        saludados.delete(message.author.id);
        marcarSaludado(message.author.id, saludados);
      }
    }
  }
};
