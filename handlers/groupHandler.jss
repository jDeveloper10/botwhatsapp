const config = require('../config/config');
const fs = require('fs');

class GroupHandler {
    constructor(sock) {
        this.sock = sock;
        this.groups = new Map();
    }

    async handleGroupEvent(event) {
        if (event.action === 'add') {
            // Enviar mensaje de bienvenida con imagen
            const welcomeImage = fs.readFileSync('./assets/welcome.jpg');
            await this.sock.sendMessage(event.id, {
                image: welcomeImage,
                caption: config.welcomeMessage,
                mentions: event.participants
            });
        } else if (event.action === 'remove') {
            // Enviar mensaje de despedida con imagen
            const goodbyeImage = fs.readFileSync('./assets/goodbye.jpg');
            await this.sock.sendMessage(event.id, {
                image: goodbyeImage,
                caption: config.goodbyeMessage,
                mentions: event.participants
            });
        }
    }
}

module.exports = GroupHandler;
