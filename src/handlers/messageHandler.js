const { sendHelp } = require('../commands/helpCommand');
const { sendPing } = require('../commands/pingCommand');
const { sendSchedule } = require('../commands/scheduleCommand');
const { createSticker } = require('../commands/stickerCommands');
const { scheduleMessage } = require('../commands/scheduleMessageCommand');
const { showLinks, addLink } = require('../commands/linkCommands');
const { scheduleNews } = require('../commands/newsCommand');
const fs = require('fs');
const path = require('path');

class MessageHandler {
    constructor(sock) {
        this.sock = sock;
        this.handle = this.handle.bind(this);
        this.isSleeping = false;
        this.sleepTime = null;
        // Agrega aquí todos los números de administradores
        this.adminNumbers = [
            '50768246752',  // Tu número
            '50712345678'   // Otros admins
        ];
    }

    isAdmin(sender) {
        // Limpia el número de cualquier formato
        const number = sender.split('@')[0].replace(/[^0-9]/g, '');
        console.log('Verificando admin para:', number);
        const isAdmin = this.adminNumbers.includes(number);
        console.log('Es admin:', isAdmin);
        return isAdmin;
    }

    async handle(message) {
        try {
            const sender = message.key.remoteJid;
            const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
            
            if (!text) return;

            const command = text.trim().split(' ')[0].toLowerCase();
            const args = text.trim().split(' ');
            const isAdminUser = this.isAdmin(sender);

            // Lista de comandos válidos
            const validCommands = ['!help', '!ping', '!schedule', '!sticker', '!links', '!addlink', '!news', '!sleep', '!wake', '!status'];
            
            // Si no es un comando válido, ignorar
            if (!validCommands.includes(command)) {
                return;
            }

            // Lista de comandos que requieren admin
            const adminCommands = ['!sleep', '!wake', '!news', '!addlink'];
            
            // Si es un comando de admin y el usuario no es admin, denegar acceso
            if (adminCommands.includes(command) && !isAdminUser) {
                await this.sock.sendMessage(sender, { 
                    text: '❌ Este comando solo puede ser usado por administradores' 
                });
                return;
            }

            // Siempre procesar comandos de despertar y estado
            if (command === '!wake' && isAdminUser) {
                this.isSleeping = false;
                this.sleepTime = null;
                await this.sock.sendMessage(sender, { 
                    text: '🌅 Bot activado y listo para recibir comandos.' 
                });
                return;
            }

            if (command === '!status') {
                const status = this.isSleeping 
                    ? `😴 Bot en modo reposo desde hace ${this.getTimeAgo()}`
                    : '🌟 Bot activo y respondiendo';
                await this.sock.sendMessage(sender, { text: status });
                return;
            }

            // Si está dormido, no procesar otros comandos
            if (this.isSleeping) return;

            // Procesar comando de dormir
            if (command === '!sleep' && isAdminUser) {
                this.isSleeping = true;
                this.sleepTime = new Date();
                await this.sock.sendMessage(sender, { 
                    text: '😴 Bot entrando en modo reposo. Usa !wake para activarlo.' 
                });
                return;
            }

            console.log("Message received:", message);

            // Manejar comando de sticker
            if (message.message && (message.message.imageMessage || message.message.videoMessage)) {
                const caption = message.message.imageMessage?.caption || message.message.videoMessage?.caption;
                if (caption && caption.toLowerCase() === '!sticker') {
                    await createSticker(this.sock, message);
                    return;
                }
            }

            switch (command) {
                case '!help':
                    sendHelp(this.sock, message.key.remoteJid);
                    break;
                case '!ping':
                    sendPing(this.sock, message.key.remoteJid);
                    break;
                case '!schedule':
                    if (args.length === 1) {
                        sendSchedule(this.sock, message.key.remoteJid);
                    } else {
                        await scheduleMessage(this.sock, message, args);
                    }
                    break;
                case '!sticker':
                    await this.sock.sendMessage(message.key.remoteJid, { 
                        text: '❌ Envía una imagen o video con el comando !sticker como descripción' 
                    });
                    break;
                case '!links':
                    await showLinks(this.sock, message.key.remoteJid);
                    break;
                case '!addlink':
                    if (isAdminUser) {
                        message.isAdmin = true;
                        await addLink(this.sock, message, args);
                    }
                    break;
                case '!news':
                    if (isAdminUser) {
                        message.isAdmin = true;
                        await scheduleNews(this.sock, message, args);
                    }
                    break;
                default:
                    console.log("Unknown command:", command);
            }
        } catch (error) {
            console.error('Error al procesar mensaje:', error);
        }
    }

    getTimeAgo() {
        if (!this.sleepTime) return 'tiempo desconocido';
        const now = new Date();
        const diff = now - this.sleepTime;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours} hora(s) y ${minutes % 60} minutos`;
        }
        return `${minutes} minutos`;
    }
}

module.exports = MessageHandler;
