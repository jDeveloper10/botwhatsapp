const reminders = new Map();

const setReminder = async (client, message, args) => {
    const chatId = message.key.remoteJid;
    const time = args[1]; // formato: 1h, 30m, etc.
    const reminder = args.slice(2).join(' ');

    if (!time || !reminder) {
        await client.sendMessage(chatId, { 
            text: '❌ Uso: !reminder 1h Mensaje del recordatorio' 
        });
        return;
    }

    const duration = parseTime(time);
    if (!duration) {
        await client.sendMessage(chatId, { 
            text: '❌ Formato de tiempo inválido. Usa: 1h, 30m, etc.' 
        });
        return;
    }

    setTimeout(async () => {
        await client.sendMessage(chatId, {
            text: `⏰ *Recordatorio:*\n${reminder}`,
            mentions: [message.key.participant || message.key.remoteJid]
        });
    }, duration);

    await client.sendMessage(chatId, { 
        text: `✅ Recordatorio configurado para ${time}` 
    });
};

const parseTime = (time) => {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1));
    
    if (isNaN(value)) return null;
    
    switch(unit) {
        case 'h': return value * 60 * 60 * 1000;
        case 'm': return value * 60 * 1000;
        default: return null;
    }
};

const formatReminderMessage = (time, message) => {
    return `┌──『 *⏰ RECORDATORIO* 』
├ *Tiempo:* ${time}
├ *Mensaje:* ${message}
└──────────────`;
};

const formatReminderNotification = (message) => {
    return `┌──『 *⏰ ¡RECORDATORIO!* 』
├ ${message}
└──────────────`;
};

module.exports = { setReminder };
