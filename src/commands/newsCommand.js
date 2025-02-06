const pendingNews = new Map();

async function scheduleNews(sock, message, args) {
    const sender = message.key.remoteJid;
    
    // Verificar si es administrador
    if (!message.isAdmin) {
        await sock.sendMessage(sender, { 
            text: '❌ Solo los administradores pueden programar noticias.' 
        });
        return;
    }

    // Formato: !news hora descripción
    if (args.length < 3) {
        await sock.sendMessage(sender, { 
            text: '❌ Formato incorrecto. Uso: !news HH:mm descripción\nEjemplo: !news 15:30 Nueva actualización del bot' 
        });
        return;
    }

    const time = args[1];
    const newsText = args.slice(2).join(' ');
    const image = message.message?.imageMessage;

    // Validar formato de hora
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
        await sock.sendMessage(sender, { 
            text: '❌ Formato de hora inválido. Use HH:mm' 
        });
        return;
    }

    // Obtener hora programada
    const [hours, minutes] = time.split(':');
    const scheduleTime = new Date();
    scheduleTime.setHours(parseInt(hours), parseInt(minutes), 0);

    if (scheduleTime <= new Date()) {
        await sock.sendMessage(sender, { 
            text: '❌ La hora debe ser posterior a la actual' 
        });
        return;
    }

    // Guardar la noticia programada
    const newsId = Date.now().toString();
    const mediaBuffer = image ? await sock.downloadMediaMessage(message) : null;

    pendingNews.set(newsId, {
        sender,
        time: scheduleTime,
        text: newsText,
        media: mediaBuffer
    });

    // Programar el envío
    setTimeout(async () => {
        try {
            const groups = await sock.groupFetchAllParticipating();
            const news = pendingNews.get(newsId);
            
            for (const groupId of Object.keys(groups)) {
                if (news.media) {
                    await sock.sendMessage(groupId, {
                        image: news.media,
                        caption: `📰 *NOTICIA IMPORTANTE* 📰\n\n${news.text}\n\n_Enviado por la administración_`
                    });
                } else {
                    await sock.sendMessage(groupId, {
                        text: `📰 *NOTICIA IMPORTANTE* 📰\n\n${news.text}\n\n_Enviado por la administración_`
                    });
                }
            }

            await sock.sendMessage(news.sender, { 
                text: '✅ Noticia enviada exitosamente a todos los grupos' 
            });
            pendingNews.delete(newsId);
        } catch (error) {
            console.error('Error al enviar noticia:', error);
            await sock.sendMessage(sender, { 
                text: '❌ Error al enviar la noticia programada' 
            });
        }
    }, scheduleTime.getTime() - Date.now());

    await sock.sendMessage(sender, { 
        text: `✅ Noticia programada exitosamente para las ${time}` 
    });
}

module.exports = {
    scheduleNews
};
