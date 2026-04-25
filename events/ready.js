module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    client.user.setActivity('el servidor 👀', { type: 3 }); // WATCHING
  },
};
