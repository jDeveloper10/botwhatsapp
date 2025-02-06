const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const config = require('../config/config');
const schedule = require('node-schedule');
const sharp = require('sharp');
const fs = require('fs');

class MessageHandler {
    constructor(sock) {
        this.sock = sock;
        this.activeUsers = new Set();
        this.messageCount = new Map();
        this.scheduledMessages = new Map();
    }

    async handleMessage(msg) {
        const sender = msg.key.participant || msg.key.remoteJid;
        const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
        
        if (!content) return;

        // Si empieza con ! es un comando
        if (content.startsWith(config.prefix)) {
            const [command, ...args] = content.slice(1).split(' ');
            await this.handleCommand(command, args, msg, sender); // Añadido sender como parámetro
            return;
        }

        // Si no empieza con !, buscar si es una pregunta
        await this.handleQuestion(content.toLowerCase(), msg);
    }

    async handleQuestion(text, msg) {
        const preguntas = config.supportMessages.preguntas;
        
        for (const categoria in preguntas) {
            const preguntasCategoria = preguntas[categoria].pregunta;
            // Buscar si alguna palabra clave está en el texto
            if (preguntasCategoria.some(keyword => text.includes(keyword))) {
                await this.sock.sendMessage(msg.key.remoteJid, {
                    text: preguntas[categoria].respuesta
                });
                return;
            }
        }

        // Si no encontró respuesta y el mensaje parece una pregunta (tiene ?)
        if (text.includes('?')) {
            await this.sock.sendMessage(msg.key.remoteJid, {
                text: 'Si tienes dudas, puedes:\n1. Usar !ayuda para ver comandos\n2. Preguntar sobre:\n- Horarios\n- Recursos\n- Evaluaciones'
            });
        }
    }

    async handleCommand(command, args, msg, sender) {
        // Verificar si es administrador
        const isAdmin = sender === config.adminNumber;

        switch (command) {
            case 'activar':
                if (!this.activeUsers.has(sender)) {
                    this.activeUsers.add(sender);
                    await this.sock.sendMessage(msg.key.remoteJid, { text: '✅ Bot activado para ti' });
                }
                break;

            case 'sticker':
                await this.createSticker(msg);
                break;

            case 'programar':
                await this.scheduleMessage(args, msg, sender);
                break;

            case 'cancelar':
                if (isAdmin) {
                    await this.cancelScheduledMessage(args[0]);
                }
                break;

            case 'bloquear':
                if (isAdmin) {
                    const target = args[0];
                    await this.sock.updateBlockStatus(target, "block");
                    await this.sock.sendMessage(msg.key.remoteJid, { text: '✅ Usuario bloqueado' });
                }
                break;

            case 'broadcast':
                if (isAdmin) {
                    await this.sendBroadcast(args.join(' '));
                }
                break;

            case 'ayuda':
                await this.sock.sendMessage(msg.key.remoteJid, {
                    text: config.supportMessages.ayuda
                });
                break;
        }
    }

    async createSticker(msg) {
        try {
            if (!msg.message.imageMessage && !msg.message.videoMessage) {
                await this.sock.sendMessage(msg.key.remoteJid, { text: '❌ Envía una imagen o video para convertir a sticker' });
                return;
            }

            const media = await downloadMediaMessage(msg, 'buffer', {});
            const stickerBuffer = await sharp(media)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .toBuffer();

            await this.sock.sendMessage(msg.key.remoteJid, {
                sticker: stickerBuffer
            });
        } catch (error) {
            console.error('Error creating sticker:', error);
        }
    }

    async scheduleMessage(args, msg, sender) {
        if (this.getMessageCount(sender) >= config.maxMessagesPerDay) {
            await this.sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Límite de mensajes programados alcanzado' 
            });
            return;
        }

        // Formato: !programar HH:mm DD-MM-YYYY número mensaje
        const [time, date, target, ...messageWords] = args;
        const message = messageWords.join(' ');
        const scheduledTime = new Date(`${date} ${time}`);

        if (isNaN(scheduledTime.getTime())) {
            await this.sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Formato inválido. Usa: !programar HH:mm DD-MM-YYYY número mensaje' 
            });
            return;
        }

        const jobId = `${sender}_${Date.now()}`;
        const job = schedule.scheduleJob(scheduledTime, async () => {
            await this.sock.sendMessage(target, { text: message });
            this.scheduledMessages.delete(jobId);
            this.messageCount.set(sender, (this.messageCount.get(sender) || 0) + 1);
        });

        this.scheduledMessages.set(jobId, job);
        await this.sock.sendMessage(msg.key.remoteJid, { 
            text: `✅ Mensaje programado para ${scheduledTime.toLocaleString()}` 
        });
    }

    async cancelScheduledMessage(jobId) {
        const job = this.scheduledMessages.get(jobId);
        if (job) {
            job.cancel();
            this.scheduledMessages.delete(jobId);
            return true;
        }
        return false;
    }

    async sendBroadcast(message) {
        for (const [groupId, group] of Object.entries(this.groups)) {
            await this.sock.sendMessage(groupId, { text: message });
        }
    }

    getMessageCount(sender) {
        return this.messageCount.get(sender) || 0;
    }
}

module.exports = MessageHandler;
