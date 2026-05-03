const { PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'messageReactionRemove',
  async execute(reaction, user, client) {
    try {
      // Ignorar bots
      if (user.bot) return;

      // Manejar partials
      if (reaction.partial) {
        await reaction.fetch();
      }
      if (reaction.message.partial) {
        await reaction.message.fetch();
      }

      // Cargar configuración de autoroles
      const filePath = path.join(__dirname, '../data/autoroles.json');
      if (!fs.existsSync(filePath)) return;
      
      const autorolesData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Verificar si el mensaje tiene autoroles configurados
      const messageConfig = autorolesData[reaction.message.id];
      if (!messageConfig) return;

      // Obtener el nombre del emoji o su ID si es personalizado
      const emojiKey = reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name;
      
      // Verificar si el emoji coincide con uno configurado (emoji -> rolID)
      const roleId = messageConfig[emojiKey];
      if (!roleId) return;

      const guild = reaction.message.guild;
      
      // Verificar que el rol existe
      const role = guild.roles.cache.get(roleId);
      if (!role) {
        console.warn(`[AutoRol] El rol ${roleId} no existe en el servidor.`);
        return;
      }

      // Verificar que el bot tiene permisos
      const botMember = await guild.members.fetch(client.user.id);
      if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        console.warn(`[AutoRol] El bot no tiene permiso de Gestionar Roles.`);
        return;
      }

      // Verificar jerarquía de roles (el rol del bot debe estar por encima del rol a asignar)
      if (botMember.roles.highest.position <= role.position) {
        console.warn(`[AutoRol] La jerarquía del rol del bot es menor o igual a la del rol ${role.name}. No puedo quitarlo.`);
        return;
      }

      const member = await guild.members.fetch(user.id);
      if (!member) return;

      // Evitar errores si el usuario no tiene el rol
      if (!member.roles.cache.has(roleId)) return;

      // Quitar el rol
      await member.roles.remove(role);
      console.log(`[AutoRol] Rol ${role.name} removido de ${user.tag} (${user.id})`);

    } catch (error) {
      console.error('[AutoRol Error - Remove]:', error);
    }
  },
};
