let startTime = Date.now();
let lastPing = Date.now();
let isActive = true;

// URL que queremos mantener activa (puede ser la URL de tu bot)
const BOT_URL = process.env.BOT_URL || 'https://tu-bot.herokuapp.com';

// Función para mantener el bot activo
async function keepAlive() {
    if (!isActive) return;
    
    try {
        // Simulamos actividad cada 5 minutos
        const now = Date.now();
        if (now - lastPing >= 5 * 60 * 1000) {
            console.log('🤖 Bot manteniéndose activo...');
            lastPing = now;
        }
    } catch (error) {
        console.error('Error en keepAlive:', error);
    }
}

// Iniciar el sistema de mantener activo
setInterval(keepAlive, 60000); // Revisar cada minuto

function formatUptime() {
    const uptime = Date.now() - startTime;
    const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
    const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((uptime % (60 * 1000)) / 1000);

    return `
╭━━━《 🤖 *ESTADO DEL BOT* 🤖 》━━━╮

┃ 📊 *Tiempo Activo*
┃ ➣ Días: ${days}
┃ ➣ Horas: ${hours}
┃ ➣ Minutos: ${minutes}
┃ ➣ Segundos: ${seconds}
┃
┃ 🟢 *Estado:* Activo
┃ 📡 *Conexión:* Estable
┃ ⚡ *Modo:* 24/7

╰━━━━━━━━━━━━━━━━━━━━━━╯`;
}

async function sendUptime(sock, jid) {
    try {
        await sock.sendMessage(jid, { text: formatUptime() });
    } catch (error) {
        console.error('Error al enviar uptime:', error);
    }
}

function resetUptime() {
    startTime = Date.now();
    console.log('⏲️ Temporizador de uptime reiniciado');
}

function toggleActive() {
    isActive = !isActive;
    return isActive;
}

module.exports = {
    sendUptime,
    resetUptime,
    formatUptime,
    keepAlive,
    toggleActive
};