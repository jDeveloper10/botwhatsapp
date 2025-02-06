async function sendPing(sock, jid) {
    console.log("Sending ping response to:", jid);
    try {
        await sock.sendMessage(jid, { text: '🏓 Pong!' });
        console.log("Ping response sent successfully.");
    } catch (error) {
        console.error("Failed to send ping response:", error);
    }
}

module.exports = {
    sendPing
};
