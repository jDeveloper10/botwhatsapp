let isBotSleeping = false;
let isInMaintenance = false;

const adminCommands = async (client, message, args) => {
    const chatId = message.key.remoteJid;
    const senderId = message.key.participant || message.key.remoteJid;

    try {
        // Log command details
        console.log('Ejecutando comando admin:', {
            command: args[0],
            senderId,
            chatId
        });

        // Verificar admin
        const isBotAdmin = senderId === process.env.BOT_ADMIN_NUMBER;
        let isGroupAdmin = false;

        if (chatId.endsWith('@g.us')) {
            const groupMetadata = await client.groupMetadata(chatId).catch(() => null);
            if (groupMetadata) {
                isGroupAdmin = groupMetadata.participants.some(
                    p => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin')
                );
            }
        }

        if (!isBotAdmin && !isGroupAdmin) {
            await client.sendMessage(chatId, { text: '⚠️ Este comando es solo para administradores' });
            return;
        }

        const command = args[0];
        let response = '';

        switch (command) {
            case '!sleep':
                isBotSleeping = true;
                response = '😴 Bot está ahora dormido. Solo admins pueden despertarlo.';
                break;
            case '!wake':
                isBotSleeping = false;
                response = '🌟 Bot está despierto y listo!';
                break;
            // ...other cases...
        }

        if (response) {
            await client.sendMessage(chatId, { text: response }).catch(console.error);
        }

    } catch (error) {
        console.error('Error en comando admin:', error);
        await client.sendMessage(chatId, { text: '❌ Error al ejecutar el comando' }).catch(console.error);
    }
};

const processAdminCommand = async (client, chatId, args) => {
    const command = args[0];
    console.log('Procesando comando admin:', command);

    switch (command) {
        case '!sleep':
            isBotSleeping = true;
            await client.sendMessage(chatId, { text: '😴 Bot está ahora dormido. Solo admins pueden despertarlo.' });
            break;

        case '!wake':
            isBotSleeping = false;
            await client.sendMessage(chatId, { text: '🌟 Bot está despierto y listo!' });
            break;

        case '!maintenance':
            isInMaintenance = !isInMaintenance;
            await client.sendMessage(chatId, { 
                text: isInMaintenance 
                    ? '🔧 Bot en modo mantenimiento. Solo admins pueden usar comandos.'
                    : '✅ Modo mantenimiento desactivado. Bot disponible para todos.'
            });
            break;

        case '!status':
            const memory = process.memoryUsage();
            const status = `🤖 Estado del Bot:
- Modo dormir: ${isBotSleeping ? 'ACTIVADO 😴' : 'DESACTIVADO 🌟'}
- Modo mantenimiento: ${isInMaintenance ? 'ACTIVADO 🔧' : 'DESACTIVADO ✅'}
- Uso de memoria: ${Math.round(memory.heapUsed / 1024 / 1024)}MB
- Tiempo activo: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`;
            await client.sendMessage(chatId, { text: status });
            break;

        // Otros comandos admin aquí...
    }
};

const canProcessMessage = async (message) => {
    if (!isBotSleeping && !isInMaintenance) return true;
    
    // Si el bot está dormido o en mantenimiento, solo permitir comandos de admin
    const isAdminNumber = message.sender === process.env.BOT_ADMIN_NUMBER;
    return isAdminNumber;
};

module.exports = { adminCommands, isBotSleeping, isInMaintenance, canProcessMessage };
