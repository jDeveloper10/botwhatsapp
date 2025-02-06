class GroupHandler {
    constructor(sock) {
        this.sock = sock;
        this.handle = this.handle.bind(this);
    }

    async handle(update) {
        try {
            console.log('Evento de grupo recibido:', update);
            const { id, participants, action } = update;

            if (!participants || !action) {
                console.log('Datos de grupo incompletos');
                return;
            }

            for (const participant of participants) {
                switch (action) {
                    case 'add':
                        console.log(`Nuevo participante: ${participant}`);
                        await this.handleWelcome(id, participant);
                        break;
                    case 'remove':
                        console.log(`Participante salió: ${participant}`);
                        await this.handleGoodbye(id, participant);
                        break;
                    default:
                        console.log(`Acción desconocida: ${action}`);
                }
            }
        } catch (error) {
            console.error('Error en handleGroupUpdate:', error);
        }
    }

    async handleWelcome(groupId, participant) {
        try {
            console.log('Manejando bienvenida para:', participant, 'en grupo:', groupId);
            const participantName = participant.split('@')[0];

            const welcomeMessage = `
╔══════════════════
║ *¡Bienvenido/a al grupo!* 🎉
╠══════════════════
║ *Participante:* @${participantName}
║ 
║ 🌟 Gracias por unirte
║ 📝 Lee las reglas del grupo
║ 💬 ¡Esperamos que disfrutes!
╚══════════════════`;

            await this.sock.sendMessage(groupId, {
                text: welcomeMessage,
                mentions: [participant]
            });
            console.log('Mensaje de bienvenida enviado exitosamente');
        } catch (error) {
            console.error('Error al enviar mensaje de bienvenida:', error);
        }
    }

    async handleGoodbye(groupId, participant) {
        try {
            console.log('Manejando despedida para:', participant, 'en grupo:', groupId);
            const participantName = participant.split('@')[0];

            const goodbyeMessage = `
╔══════════════════
║ *¡Hasta pronto!* 👋
╠══════════════════
║ *Participante:* @${participantName}
║ 
║ 🌟 Gracias por haber sido parte
║ ✨ ¡Te deseamos lo mejor!
╚══════════════════`;

            await this.sock.sendMessage(groupId, {
                text: goodbyeMessage,
                mentions: [participant]
            });
            console.log('Mensaje de despedida enviado exitosamente');
        } catch (error) {
            console.error('Error al enviar mensaje de despedida:', error);
        }
    }
}

module.exports = GroupHandler;
