
const fs = require('fs');
const path = require('path');

let isSleeping = false;

async function toggleSleep(sock, message) {
    const sender = message.key.remoteJid;
    
    if (sender !== process.env.BOT_ADMIN_NUMBER) {
        await sock.sendMessage(sender, { 
            text: '❌ Solo el administrador puede usar este comando.' 
        });
        return;
    }

    isSleeping = !isSleeping;
    const imagePath = path.join(__dirname, '../assets', 
        isSleeping ? 'goodbye.jpg' : 'welcome.jpg'
    );

    try {
        const image = fs.readFileSync(imagePath);
        await sock.sendMessage(sender, { 
            image,
            caption: isSleeping ? 
                '😴 Bot entrando en modo descanso...' : 
                '👋 ¡Bot activado y listo para ayudar!'
        });
    } catch (error) {
        console.error('Error al enviar imagen:', error);
        await sock.sendMessage(sender, { 
            text: isSleeping ? 
                '😴 Bot entrando en modo descanso...' : 
                '👋 ¡Bot activado y listo para ayudar!'
        });
    }
}

function isInSleepMode() {
    return isSleeping;
}

module.exports = {
    toggleSleep,
    isInSleepMode
};
