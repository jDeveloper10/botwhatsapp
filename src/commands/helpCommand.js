const showHelp = async (client, chatId) => {
    const menu = `┌──『 *BOT DE PROGRAMACIÓN* 』
│
├─『 *COMANDOS BÁSICOS* 』
│ • !help - 📚 Ver comandos
│ • !ping - 🔄 Probar conexión
│ • !schedule - 📅 Ver horario
│ • !reminder - ⏰ Crear recordatorio
│
├─『 *GESTIÓN DE GRUPOS* 』
│ • !setwelcome - 👋 Config. bienvenida
│ • !poll - 📊 Crear votación
│ • !vote - 🗳️ Votar
│ • !news - 📢 Enviar noticia
│
├─『 *PROGRAMACIÓN* 』
│ • !code - 💻 Ejecutar JavaScript
│ • !docs - 📖 Buscar documentación
│ • !github - 🔍 Buscar repositorios
│ • !example - 📝 Ver ejemplos
│
├─『 *UTILIDADES* 』
│ • !sticker - 🖼️ Crear sticker
│ • !links - 🔗 Ver enlaces
│ • !addlink - ➕ Agregar enlace
│
├─『 *ADMIN* 』
│ • !status - ℹ️ Estado del bot
│ • !maintenance - 🔧 Modo mant.
│ • !sleep/!wake - 💤 Control bot
│ • !kick/!promote - 👑 Gestión users
└──────────────`;

    await client.sendMessage(chatId, { text: menu });
};

module.exports = { showHelp };
