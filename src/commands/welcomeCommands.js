const fs = require('fs');
const path = require('path');

const welcomeMessages = new Map();

const setWelcome = async (client, message, args) => {
    const chatId = message.key.remoteJid;
    const welcomeMsg = args.slice(1).join(' ');
    welcomeMessages.set(chatId, welcomeMsg);
    await client.sendMessage(chatId, { text: '✅ Mensaje de bienvenida configurado' });
};

const handleGroupParticipantsUpdate = async (client, { id, participants, action }) => {
    if (action === 'add') {
        const welcomeMsg = welcomeMessages.get(id) || '¡Bienvenido/a al grupo! 🎉';
        const welcomeImage = path.join(__dirname, '..', 'welcome.jpg');

        for (const participant of participants) {
            if (fs.existsSync(welcomeImage)) {
                await client.sendMessage(id, {
                    image: fs.readFileSync(welcomeImage),
                    caption: `@${participant.split('@')[0]} ${welcomeMsg}`,
                    mentions: [participant]
                });
            }
        }
    }
};

module.exports = { setWelcome, handleGroupParticipantsUpdate };
