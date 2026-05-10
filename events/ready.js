const { ActivityType } = require('discord.js');
const { getPendingTempBans, removeTempBan } = require('../utils/warnManager');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    client.user.setActivity('🛡️ LigaPro Ecuabet x4 | VAR Activo', { type: ActivityType.Watching });

    // ── Restaurar temp bans pendientes tras reinicio ────────────
    const tempBans = getPendingTempBans();
    const entries  = Object.entries(tempBans);
    if (entries.length > 0) {
      console.log(`[AntiRaid] Restaurando ${entries.length} temp ban(s) pendiente(s)...`);
    }

    for (const [userId, data] of entries) {
      const delay = data.unbanAt - Date.now();

      const doUnban = async () => {
        try {
          const guild = client.guilds.cache.get(data.guildId);
          if (guild) {
            await guild.members.unban(userId, '⏱️ Temp ban expirado — AntiRaid LigaPro');
            console.log(`[AntiRaid] Unban automático: ${userId}`);
          }
        } catch (_) {}
        removeTempBan(userId);
      };

      if (delay <= 0) {
        // Ya expiró mientras el bot estaba caído → desbanear ahora
        await doUnban();
      } else {
        // Aún tiene tiempo → programar
        setTimeout(doUnban, delay);
        console.log(`[AntiRaid] Unban de ${userId} en ${Math.ceil(delay / 60000)} min`);
      }
    }
  },
};
