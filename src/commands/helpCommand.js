async function sendHelp(sock, jid) {
    const helpMessage = `
🤖 *Comandos Disponibles* 🤖

📝 *Comandos Básicos:*
1. 📖 *!help* - Muestra este mensaje de ayuda
2. 🏓 *!ping* - Responde con Pong!
3. 📅 *!schedule* - Muestra los horarios de clase
4. ℹ️ *!status* - Muestra el estado actual del bot

🎯 *Comandos de Stickers:*
5. 🖼️ *!sticker* - Crea un sticker
   _Envía una imagen o video con la descripción !sticker_

📨 *Mensajes Programados:*
6. ⏰ *!schedule +número hora mensaje* - Programa un mensaje
   _Ejemplo: !schedule +50712345678 15:30 Hola, ¿cómo estás?_

🔗 *Links:*
7. 📋 *!links* - Muestra todos los links guardados
8. ➕ *!addlink nombre url* - Agrega un nuevo link

👑 *Comandos de Admin:*
9. 😴 *!sleep* - Pone el bot en modo reposo
10. 🌅 *!wake* - Activa el bot
11. 📰 *!news* - Programa una noticia para todos los grupos
    _Ejemplo: !news 15:30 Nueva actualización_
    _Puedes incluir una imagen con la noticia_
`;
    try {
        await sock.sendMessage(jid, { text: helpMessage });
        console.log("Mensaje de ayuda enviado exitosamente.");
    } catch (error) {
        console.error("Error al enviar mensaje de ayuda:", error);
    }
}

module.exports = {
    sendHelp
};
