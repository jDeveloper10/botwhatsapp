const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const nodemailer = require('nodemailer');
const qrcode = require('qrcode');
const fs = require('fs');
require('dotenv').config();
const MessageHandler = require('./src/handlers/messageHandler');
const GroupHandler = require('./src/handlers/groupHandler');
const SessionManager = require('./src/utils/sessionManager');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

async function sendQRByEmail(qr) {
    try {
        console.log('Generando QR y enviando por correo...');
        const qrImagePath = 'whatsapp-qr.png';
        await qrcode.toFile(qrImagePath, qr, {
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            width: 800
        });

        const info = await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: process.env.RECIPIENT_EMAIL,
            subject: 'Tu código QR de WhatsApp ' + new Date().toLocaleString(),
            text: 'Escanea este código QR para conectar WhatsApp',
            attachments: [{
                filename: 'whatsapp-qr.png',
                path: qrImagePath
            }]
        });

        console.log('✅ QR enviado por correo exitosamente');
    } catch (error) {
        console.error('❌ Error al enviar QR:', error);
    }
}

async function startWhatsApp() {
    try {
        await SessionManager.createSessionFolder();
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
            syncFullHistory: false,
            getMessage: async (key) => {
                return { conversation: 'hello' };
            }
        });

        const messageHandler = new MessageHandler(sock);
        const groupHandler = new GroupHandler(sock);

        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('messages.upsert', async ({ messages }) => {
            try {
                for (const msg of messages) {
                    if (msg.message) await messageHandler.handle(msg);
                }
            } catch (error) {
                console.error('Error al procesar mensajes:', error);
            }
        });
        sock.ev.on('group-participants.update', groupHandler.handle);

        sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
            if (qr) {
                console.log('🔄 Nuevo código QR generado');
                await sendQRByEmail(qr);
            }
            
            if (connection === 'open') {
                console.log('✅ Conectado a WhatsApp exitosamente');
            } else if (connection === 'close') {
                const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('❌ Conexión cerrada, intentando reconectar...', shouldReconnect);
                if (shouldReconnect) {
                    startWhatsApp();
                }
            }
        });

    } catch (error) {
        console.error('Error:', error);
        setTimeout(startWhatsApp, 3000);
    }
}

startWhatsApp();