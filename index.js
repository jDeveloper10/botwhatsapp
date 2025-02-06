const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Importar comandos
const { createSticker } = require('./src/commands/stickerCommands');
const { showLinks, addLink } = require('./src/commands/linkCommands');
const { sendSchedule } = require('./src/commands/scheduleCommand');
const { sendPing } = require('./src/commands/pingCommand');
const { scheduleNews } = require('./src/commands/newsCommand');
const { scheduleMessage } = require('./src/commands/scheduleMessageCommand');
const AdminCommands = require('./src/commands/admin');
const { showHelp } = require('./src/commands/helpCommand');
const { toggleSleep, isInSleepMode } = require('./src/commands/sleepCommand');

// Asegurar que existan los directorios necesarios
const dirs = [
    path.join(__dirname, 'auth_info_baileys'),
    path.join(__dirname, 'temp'),
    path.join(__dirname, 'src/data')
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

async function sendQRByEmail(qr) {
    try {
        console.log('Generando QR y enviando por correo...');
        const qrImagePath = path.join(__dirname, 'whatsapp-qr.png');
        
        await qrcode.toFile(qrImagePath, qr, {
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            width: 800,
            margin: 1
        });

        if (!fs.existsSync(qrImagePath)) {
            throw new Error('No se pudo generar la imagen QR');
        }

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: process.env.RECIPIENT_EMAIL,
            subject: 'Código QR WhatsApp Bot - ' + new Date().toLocaleString(),
            text: 'Escanea este código QR para conectar WhatsApp',
            attachments: [{
                filename: 'whatsapp-qr.png',
                path: qrImagePath
            }]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ QR enviado por correo exitosamente', info.messageId);
        
        fs.unlinkSync(qrImagePath);
    } catch (error) {
        console.error('❌ Error al enviar QR:', error);
    }
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        defaultQueryTimeoutMs: undefined,
        syncFullHistory: false
    });

    // Inicializar comandos de admin
    const adminCommands = new AdminCommands(sock);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('🔄 Nuevo código QR generado');
            await sendQRByEmail(qr);
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexión cerrada debido a:', lastDisconnect?.error, ', Reconectando:', shouldReconnect);
            
            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 5000);
            }
        } else if (connection === 'open') {
            console.log('¡Conexión abierta!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message) return;
            
            const messageType = Object.keys(m.message)[0];
            const messageContent = m.message[messageType];
            const sender = m.key.remoteJid;

            // Verificar si es comando !sleep
            if (messageType === 'conversation' && 
                messageContent.toLowerCase() === '!sleep') {
                await toggleSleep(sock, m);
                return;
            }

            // Si está en modo sleep, solo responder al admin
            if (isInSleepMode() && sender !== process.env.BOT_ADMIN_NUMBER) {
                return;
            }
            
            if (messageType === 'conversation') {
                const text = messageContent.toLowerCase();
                const args = text.split(' ');
                const command = args[0];

                switch(command) {
                    case '!links':
                        await showLinks(sock, m.key.remoteJid);
                        break;
                    case '!addlink':
                        await addLink(sock, m, args);
                        break;
                    case '!schedule':
                        await sendSchedule(sock, m.key.remoteJid);
                        break;
                    case '!ping':
                        await sendPing(sock, m.key.remoteJid);
                        break;
                    case '!news':
                        await scheduleNews(sock, m, args);
                        break;
                    case '!programar':
                        await scheduleMessage(sock, m, args);
                        break;
                    case '!help':
                        const isAdmin = m.key.remoteJid === process.env.BOT_ADMIN_NUMBER;
                        await showHelp(sock, m.key.remoteJid, isAdmin);
                        break;
                    // Comandos de admin
                    case '!broadcast':
                        if (m.key.remoteJid === process.env.BOT_ADMIN_NUMBER) {
                            await adminCommands.broadcast(args[1], args.slice(2).join(' '));
                        }
                        break;
                    case '!block':
                        if (m.key.remoteJid === process.env.BOT_ADMIN_NUMBER) {
                            await adminCommands.blockUser(args[1]);
                        }
                        break;
                }
            } else if (messageType === 'imageMessage' || messageType === 'videoMessage') {
                const caption = m.message[messageType].caption?.toLowerCase() || '';
                
                if (caption === '!sticker') {
                    await createSticker(sock, m);
                }
            }
        } catch (error) {
            console.error('Error al procesar mensaje:', error);
        }
    });
}

// Manejo de errores no capturados
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

// Iniciar el bot
connectToWhatsApp();
