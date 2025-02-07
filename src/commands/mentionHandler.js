const path = require('path');
const fs = require('fs');

const messages = [
    "¡Hola! 🌟 Que tengas un día lleno de éxitos y alegría.",
    "¡Hey! 🌈 Recuerda que eres capaz de lograr todo lo que te propongas.",
    "¡Saludos! ⭐ Tu presencia ilumina el grupo.",
    "¡Hola! 🌺 Espero que estés teniendo un día maravilloso.",
    "¡Hey! 🍀 La suerte está de tu lado hoy.",
    "¡Saludos! 💫 Tu energía positiva es contagiosa."
];

const handleMention = async (client, message) => {
    try {
        // Obtener el ID del bot
        const botNumber = client.user.id.split(':')[0] + '@s.whatsapp.net';
        
        // Verificar si el mensaje es una mención
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        console.log('Menciones detectadas:', mentionedJids, 'Bot ID:', botNumber);

        if (mentionedJids.includes(botNumber)) {
            const chatId = message.key.remoteJid;
            const sender = message.key.participant || message.key.remoteJid;
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            
            // Ruta a la imagen de bienvenida
            const welcomeImage = path.join(__dirname, '..', 'welcome.jpg');
            
            console.log('Enviando respuesta a:', sender, 'en chat:', chatId);

            try {
                if (fs.existsSync(welcomeImage)) {
                    await client.sendMessage(chatId, {
                        image: fs.readFileSync(welcomeImage),
                        caption: `@${sender.split('@')[0]} ${randomMessage}`,
                        mentions: [sender]
                    });
                } else {
                    console.log('Imagen no encontrada en:', welcomeImage);
                    await client.sendMessage(chatId, {
                        text: `@${sender.split('@')[0]} ${randomMessage}`,
                        mentions: [sender]
                    });
                }
            } catch (sendError) {
                console.error('Error enviando mensaje:', sendError);
            }
        }
    } catch (error) {
        console.error('Error al manejar mención:', error);
    }
};

module.exports = { handleMention };
