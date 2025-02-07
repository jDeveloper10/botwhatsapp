const schedule = require('node-schedule');

async function handleScheduleMessage(sock, msg) {
    const jid = msg.key.remoteJid;
    const text = msg.message?.conversation || '';
    const args = text.split(' ');

    // Validate command format
    if (args[0].toLowerCase() !== '!programar' || args.length < 4) {
        await sock.sendMessage(jid, {
            text: `❌ Formato incorrecto.\n\n*Uso del comando:*\n!programar NÚMERO OPCIÓN MENSAJE\n\n` +
                 `*Opciones disponibles:*\n` +
                 `1. 5 minutos\n2. 10 minutos\n3. 20 minutos\n4. 30 minutos\n5. 60 minutos\n\n` +
                 `*Ejemplo:*\n!programar 507xxxxxxxx 2 Hola, ¿cómo estás?`
        });
        return;
    }

    // Extraer datos del comando
    const phoneNumber = args[1].replace(/\D/g, '');
    const timeOption = parseInt(args[2]);
    const messageText = args.slice(3).join(' ');

    // Validar opción de tiempo
    if (isNaN(timeOption) || timeOption < 1 || timeOption > 5) {
        await sock.sendMessage(jid, {
            text: '❌ Opción de tiempo inválida. Elige un número del 1 al 5.'
        });
        return;
    }

    // Validar número
    try {
        const [result] = await sock.onWhatsApp(phoneNumber + '@s.whatsapp.net');
        if (!result?.exists) {
            await sock.sendMessage(jid, {
                text: '❌ Este número no está en WhatsApp.'
            });
            return;
        }

        // Calcular tiempo de envío
        const delays = [5, 10, 20, 30, 60];
        const scheduledTime = new Date(Date.now() + delays[timeOption - 1] * 60000);

        // Programar mensaje
        schedule.scheduleJob(scheduledTime, async () => {
            try {
                await sock.sendMessage(result.jid, { text: messageText });
            } catch (err) {
                console.error('Error sending scheduled message:', err);
            }
        });

        // Confirmar programación
        await sock.sendMessage(jid, {
            text: `✅ *Mensaje Programado*\n\n` +
                  `📱 Para: ${phoneNumber}\n` +
                  `🕒 Se enviará en: ${delays[timeOption - 1]} minutos\n` +
                  `⏰ Hora: ${scheduledTime.toLocaleTimeString()}\n` +
                  `📝 Mensaje: ${messageText}`
        });

    } catch (error) {
        console.error('Error:', error);
        await sock.sendMessage(jid, {
            text: '❌ Error al programar el mensaje.'
        });
    }
}

module.exports = {
    handleScheduleMessage
};
