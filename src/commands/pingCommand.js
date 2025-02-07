async function sendPing(sock, jid) {
    try {
        const start = new Date().getTime();
        
        // Send initial message
        const message = await sock.sendMessage(jid, { text: '🏓 Pong!' });
        
        // Calculate response time
        const end = new Date().getTime();
        const responseTime = end - start;
        
        // Update message with latency info
        await sock.sendMessage(jid, { 
            text: `🏓 Pong!\n⚡ Latencia: ${responseTime}ms\n✅ Bot Activo` 
        }, { quoted: message });
        
    } catch (error) {
        console.error('Error en comando ping:', error);
        await sock.sendMessage(jid, { text: '❌ Error al ejecutar ping' });
    }
}

module.exports = {
    sendPing
};
