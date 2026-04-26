module.exports = {
  name: 'messageReactionRemove',
  async execute(reaction, user, client) {
    if (user.bot) return;
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }

    if (!global.autorolData) return;
    const entry = global.autorolData[reaction.message.id];
    if (!entry) return;
    if (reaction.emoji.name !== '✅') return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const role = guild.roles.cache.get(entry.roleId);
    if (!role) return;

    await member.roles.remove(role).catch(console.error);
  },
};
