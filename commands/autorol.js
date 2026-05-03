const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { isAdmin, noPermReply } = require('./utils');
const { COLORS, AUTOROLES_CHANNEL_ID } = require('../config');

const autorolesPath = path.join(__dirname, '../data/autoroles.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorol')
    .setDescription('Crea o añade un autorol a un mensaje')
    .addRoleOption(opt =>
      opt.setName('rol').setDescription('Rol que se dará al reaccionar').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('emoji').setDescription('Emoji para la reacción (ej: ✅ o un emoji personalizado)').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('mensaje_id').setDescription('ID de mensaje existente (opcional, para añadir a uno creado)').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('descripcion').setDescription('Descripción (solo si se crea un mensaje nuevo)').setRequired(false)
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) return noPermReply(interaction);

    const rol = interaction.options.getRole('rol');
    const emojiInput = interaction.options.getString('emoji');
    const mensajeId = interaction.options.getString('mensaje_id');
    const descripcion = interaction.options.getString('descripcion') || `Reacciona con ${emojiInput} para obtener el rol **${rol.name}**.`;

    const channel = interaction.guild.channels.cache.get(AUTOROLES_CHANNEL_ID);
    if (!channel) {
      return interaction.reply({ content: '❌ No se encontró el canal de autoroles configurado.', flags: MessageFlags.Ephemeral });
    }

    let msg;

    if (mensajeId) {
      try {
        msg = await channel.messages.fetch(mensajeId);
      } catch (error) {
        return interaction.reply({ content: '❌ No se pudo encontrar un mensaje con esa ID en el canal de autoroles.', flags: MessageFlags.Ephemeral });
      }
    } else {
      const embed = new EmbedBuilder()
        .setColor(rol.color || COLORS.INFO)
        .setTitle(`🏷️ Sistema de Autoroles`)
        .setDescription(descripcion + '\n\nSelecciona las reacciones abajo para obtener/quitar los roles correspondientes.')
        .setFooter({ text: 'Quita tu reacción para remover el rol' })
        .setTimestamp();

      msg = await channel.send({ embeds: [embed] });
    }

    // Intentar reaccionar con el emoji provisto para que los usuarios puedan hacer clic
    try {
      await msg.react(emojiInput);
    } catch (error) {
      console.error(error);
      return interaction.reply({ content: '❌ Emoji inválido o el bot no tiene acceso a él.', flags: MessageFlags.Ephemeral });
    }

    // Guardar en el JSON para persistencia
    let autorolesData = {};
    if (fs.existsSync(autorolesPath)) {
      try {
        const fileContent = fs.readFileSync(autorolesPath, 'utf8');
        if (fileContent.trim()) {
          autorolesData = JSON.parse(fileContent);
        }
      } catch (err) {
        console.error('Error parseando autoroles.json:', err);
      }
    }

    if (!autorolesData[msg.id]) {
      autorolesData[msg.id] = {};
    }
    
    // Si es un emoji custom (<:nombre:ID> o <a:nombre:ID>), guardamos solo la ID
    // Si es un emoji estándar, guardamos el caracter
    const customEmojiMatch = emojiInput.match(/<?(?:a)?:?(\w{2,32}):(\d{17,19})>?/);
    const emojiKey = customEmojiMatch ? customEmojiMatch[2] : emojiInput;

    autorolesData[msg.id][emojiKey] = rol.id;
    fs.writeFileSync(autorolesPath, JSON.stringify(autorolesData, null, 2));

    await interaction.reply({
      content: `✅ Autorol configurado exitosamente en el mensaje [${msg.id}](${msg.url}).\nEmoji: ${emojiInput} -> Rol: **${rol.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
