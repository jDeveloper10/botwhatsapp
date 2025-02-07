const { downloadContentFromMessage, downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');

const listGroups = async (client, message) => {
    const chatId = message.key.remoteJid;
    const senderId = message.key.participant || message.key.remoteJid;

    // Verificar si es admin del bot
    if (senderId !== process.env.BOT_ADMIN_NUMBER) {
        await client.sendMessage(chatId, { text: '⚠️ Este comando es solo para el administrador del bot' });
        return;
    }

    try {
        // Obtener todos los chats
        const groups = await client.groupFetchAllParticipating();
        
        let response = '*📑 Grupos donde está el bot:*\n\n';
        let index = 1;

        for (const [id, group] of Object.entries(groups)) {
            response += `${index}. *${group.subject}*\n`;
            response += `   ID: ${id}\n`;
            response += `   Miembros: ${group.participants.length}\n\n`;
            index++;
        }

        await client.sendMessage(chatId, { text: response });
    } catch (error) {
        console.error('Error listando grupos:', error);
        await client.sendMessage(chatId, { text: '❌ Error al listar grupos' });
    }
};

const sendNewsToGroup = async (client, message, args) => {
    const chatId = message.key.remoteJid;
    const senderId = message.key.participant || message.key.remoteJid;

    try {
        if (senderId !== process.env.BOT_ADMIN_NUMBER) {
            await client.sendMessage(chatId, { text: '⚠️ Este comando es solo para el administrador del bot' });
            return;
        }

        if (!message.message?.imageMessage) {
            await client.sendMessage(chatId, { 
                text: '❌ Envía una imagen con el comando:\n!news ID_GRUPO Texto de la noticia' 
            });
            return;
        }

        const targetGroupId = args[1];
        if (!targetGroupId) {
            await client.sendMessage(chatId, { text: '❌ Especifica el ID del grupo' });
            return;
        }

        // Nueva implementación para descargar imagen
        console.log('Descargando imagen...');
        const tempFile = path.join(tmpdir(), `news-${Date.now()}.jpg`);
        
        try {
            const buffer = await downloadMediaMessage(
                message,
                'buffer',
                {},
                {
                    logger: console,
                    reuploadRequest: client.updateMediaMessage
                }
            );

            fs.writeFileSync(tempFile, buffer);
            console.log('Imagen guardada temporalmente en:', tempFile);

            const newsText = args.slice(2).join(' ');
            const newsMessage = newsText ? `📢 *NOTICIA*\n\n${newsText}` : '📢 *NOTICIA*';

            await client.sendMessage(targetGroupId, {
                image: { url: tempFile },
                caption: newsMessage
            });

            // Limpiar archivo temporal
            fs.unlinkSync(tempFile);
            await client.sendMessage(chatId, { text: '✅ Noticia enviada correctamente' });

        } catch (downloadError) {
            console.error('Error procesando imagen:', downloadError);
            throw new Error('No se pudo procesar la imagen');
        }

    } catch (error) {
        console.error('Error enviando noticia:', error);
        await client.sendMessage(chatId, { 
            text: '❌ Error al enviar la noticia: ' + (error.message || 'Error desconocido')
        });
    }
};

const formatGroupsList = (groups) => {
    let message = `┌──『 *📑 GRUPOS* 』\n│\n`;
    Object.entries(groups).forEach(([id, group], index) => {
        message += `├─『 *${index + 1}.* ${group.subject} 』\n`;
        message += `│ • ID: ${id}\n`;
        message += `│ • Miembros: ${group.participants.length}\n│\n`;
    });
    message += `└──────────────`;
    return message;
};

const formatNewsMessage = (text) => {
    return `┌──『 *📢 NOTICIA* 』
│
${text.split('\n').map(line => '├ ' + line).join('\n')}
│
└──────────────`;
};

module.exports = { listGroups, sendNewsToGroup };
