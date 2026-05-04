const { PermissionsBitField } = require('discord.js');

// Configuración de roles y emojis (emoji -> roleID)
const ROLES_CONFIG = {
  '📢': '1497691429445832815',
  '⚽': '1497691648535171162',
  '📅': '1497691693221285999',
  '📊': '1497691694756266086',
  '📱': '1497691774808883291',
  '🆚': '1500626740551352340',
  '🤝': '1500626740551352340'
};

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user) {
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

      // Obtener el nombre del emoji o su ID si es personalizado
      const emojiKey = reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name;
      
      // Verificar si el emoji coincide con uno configurado en ROLES_CONFIG
      const roleId = ROLES_CONFIG[emojiKey];
      if (!roleId) return;

      const guild = reaction.message.guild;
      
      // Verificar que el rol existe
      const role = guild.roles.cache.get(roleId);
      if (!role) {
        console.warn(`[AutoRol] El rol ${roleId} no existe en el servidor.`);
        return;
      }

      // Obtener el miembro del bot en el servidor
      const botMember = guild.members.me;
      
      if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        console.warn(`[AutoRol] El bot no tiene permiso de Gestionar Roles.`);
        return;
      }

      // Verificar jerarquía de roles (el rol del bot debe estar por encima del rol a asignar)
      if (botMember.roles.highest.position <= role.position) {
        console.warn(`[AutoRol] La jerarquía del rol del bot es menor o igual a la del rol ${role.name}. No puedo asignarlo.`);
        return;
      }

      const member = await guild.members.fetch(user.id);
      if (!member) return;

      // Evitar errores si el usuario ya tiene el rol
      if (member.roles.cache.has(roleId)) return;

      // Asignar el rol
      await member.roles.add(role);
      console.log(`[AutoRol] Rol ${role.name} asignado a ${user.tag} (${user.id})`);

    } catch (error) {
      console.error('[AutoRol Error - Add]:', error);
    }
  },
};
