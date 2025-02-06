const scheduledMessages = new Map();
const userLimits = new Map();

// Resetear límites diariamente
setInterval(() => {
    userLimits.clear();
}, 24 * 60 * 60 * 1000);

function validatePhoneNumber(number) {
    // Validar formato: +[código de país][número]
    // Ejemplos válidos: +123456789012, +50712345678
    return /^\+\d{10,14}$/.test(number);
}

function formatPhoneNumber(number) {
    // Remover el + y convertir a formato WhatsApp
    return number.substring(1) + "@s.whatsapp.net";
}

function validateTime(time) {
    // Validar formato: HH:mm (24 horas)
    const [hours, minutes] = time.split(':');
    const now = new Date();
    const scheduleTime = new Date();
    scheduleTime.setHours(parseInt(hours), parseInt(minutes), 0);
    
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time) && scheduleTime > now;
}

async function scheduleMessage(sock, message, args) {
    const senderId = message.key.remoteJid;
    const today = new Date().toDateString();
    
    // Verificar límite diario
    const userKey = `${senderId}_${today}`;
    const userCount = userLimits.get(userKey) || 0;
    
    if (userCount >= 8) {
        await sock.sendMessage(senderId, { 
            text: '❌ Has alcanzado el límite de 8 mensajes programados por día' 
        });
        return;
    }

    // Formato esperado: !schedule +número hora mensaje
    if (args.length < 4) {
        await sock.sendMessage(senderId, { 
            text: '❌ Formato incorrecto. Uso: !schedule +número hora mensaje\nEjemplo: !schedule +50712345678 15:30 Hola, ¿cómo estás?' 
        });
        return;
    }

    const number = args[1];
    const time = args[2];
    const messageText = args.slice(3).join(' ');

    // Validaciones
    if (!validatePhoneNumber(number)) {
        await sock.sendMessage(senderId, { 
            text: '❌ Número de teléfono inválido. Debe incluir código de país.\nEjemplo: +50712345678' 
        });
        return;
    }

    if (!validateTime(time)) {
        await sock.sendMessage(senderId, { 
            text: '❌ Hora inválida. Debe estar en formato HH:mm y ser posterior a la hora actual' 
        });
        return;
    }

    // Programar mensaje
    const [hours, minutes] = time.split(':');
    const scheduleTime = new Date();
    scheduleTime.setHours(parseInt(hours), parseInt(minutes), 0);

    const timeoutId = setTimeout(async () => {
        try {
            await sock.sendMessage(formatPhoneNumber(number), { text: messageText });
            scheduledMessages.delete(timeoutId);
            
            await sock.sendMessage(senderId, { 
                text: '✅ Mensaje enviado exitosamente' 
            });
        } catch (error) {
            await sock.sendMessage(senderId, { 
                text: '❌ Error al enviar el mensaje programado' 
            });
        }
    }, scheduleTime.getTime() - Date.now());

    // Guardar mensaje programado
    scheduledMessages.set(timeoutId, {
        sender: senderId,
        receiver: number,
        time: scheduleTime,
        message: messageText
    });

    // Actualizar límite del usuario
    userLimits.set(userKey, userCount + 1);

    await sock.sendMessage(senderId, { 
        text: `✅ Mensaje programado exitosamente para las ${time}\nMensajes restantes hoy: ${8 - (userCount + 1)}` 
    });
}

module.exports = {
    scheduleMessage
};
