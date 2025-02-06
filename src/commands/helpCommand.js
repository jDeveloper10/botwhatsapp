const commands = {
    '!links': '🔗 Muestra todos los links importantes guardados',
    '!addlink': '📎 Agrega un nuevo link al repositorio\n   └ Uso: !addlink nombre url',
    '!schedule': '📅 Muestra los horarios de clases y actividades',
    '!ping': '🏓 Verifica si el bot está activo y respondiendo',
    '!sticker': '🖼️ Convierte una imagen o video en sticker\n   └ Envía una imagen/video con el comando como descripción',
    '!programar': '⏰ Programa un mensaje para enviar más tarde\n   └ Uso: !programar +número HH:mm mensaje',
    '!help': '💡 Muestra esta lista de comandos disponibles'
};

const adminCommands = {
    '!news': '📢 Programa una noticia para todos los grupos\n   └ Uso: !news HH:mm mensaje',
    '!broadcast': '📣 Envía un mensaje a todos los grupos',
    '!block': '🚫 Bloquea a un usuario específico'
};

async function showHelp(sock, jid, isAdmin = false) {
    try {
        let helpText = `
╭━━━━《 🤖 *COMANDOS DEL BOT* 🤖 》━━━━╮

`;
        
        // Agregar comandos normales
        Object.entries(commands).forEach(([cmd, desc]) => {
            helpText += `┃ ${cmd}\n┃ ${desc}\n┃\n`;
        });

        // Agregar comandos de admin si el usuario es admin
        if (isAdmin) {
            helpText += `
╰━━━━━━━━━━━━━━━━━━━━━━━╯
╭━━━《 👑 *COMANDOS ADMIN* 👑 》━━━╮

`;
            Object.entries(adminCommands).forEach(([cmd, desc]) => {
                helpText += `┃ ${cmd}\n┃ ${desc}\n┃\n`;
            });
        }

        helpText += `╰━━━━━━━━━━━━━━━━━━━━━━━╯`;

        await sock.sendMessage(jid, { text: helpText });
    } catch (error) {
        console.error('Error al mostrar ayuda:', error);
        await sock.sendMessage(jid, { 
            text: '❌ Error al mostrar la ayuda.' 
        });
    }
}

module.exports = {
    showHelp
};
