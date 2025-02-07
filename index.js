const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { showHelp } = require('./src/commands/helpCommand');
const { showLinks, addLink } = require('./src/commands/linkCommands');
const { sendSchedule } = require('./src/commands/scheduleCommand');
const { sendPing } = require('./src/commands/pingCommand');
const { createSticker } = require('./src/commands/stickerCommands');
const { handleScheduleMessage } = require('./src/commands/scheduleMessageCommand');
const { adminCommands, canProcessMessage } = require('./src/commands/adminCommands');
const { handleMention } = require('./src/commands/mentionHandler');
const { executeCode } = require('./src/commands/codeExecutor');
const { listGroups, sendNewsToGroup } = require('./src/commands/groupCommands');
const { createPoll, vote } = require('./src/commands/pollCommands');
const { setWelcome, handleGroupParticipantsUpdate } = require('./src/commands/welcomeCommands');
const { setReminder } = require('./src/commands/reminderCommands');
const { searchDocs, searchGithub, codeExample } = require('./src/commands/codeFetcher');

// Ensure directories exist
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const TEMP_DIR = path.join(__dirname, 'temp');
[AUTH_DIR, TEMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

let connectionAttempts = 0;
const MAX_RETRIES = 5;

async function sendQRByEmail(qr) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD || !process.env.RECIPIENT_EMAIL) {
        console.error('❌ Error: Missing email configuration in .env file');
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });

        const qrImagePath = path.join(TEMP_DIR, 'whatsapp-qr.png');
        await qrcode.toFile(qrImagePath, qr);
        console.log('🔲 QR generado correctamente');

        const info = await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: process.env.RECIPIENT_EMAIL,
            subject: 'WhatsApp Bot QR Code - ' + new Date().toLocaleString(),
            text: 'Escanea este código QR para conectar WhatsApp',
            attachments: [{ filename: 'whatsapp-qr.png', path: qrImagePath }]
        });

        console.log('✅ QR enviado por correo:', info.messageId);
        fs.unlinkSync(qrImagePath);
    } catch (error) {
        console.error('❌ Error al enviar QR:', error);
    }
}

async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

        // Simplificar la configuración del socket
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
            // Configuración básica y estable
            getMessage: async () => {
                return { conversation: '' };
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: false,
            // Eliminar opciones problemáticas
            // patchMessageBeforeSending: true,
            // shouldIgnoreJid: jid => isJidBroadcast(jid),
        });

        // Mejorar manejo de credenciales
        sock.ev.on('creds.update', async () => {
            await saveCreds();
            console.log('✅ Credenciales actualizadas y guardadas');
        });

        // Manejo mejorado de conexión
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (connection === 'connecting') {
                console.log('🔄 Conectando...');
            }

            if (qr) {
                console.log('🔄 Nuevo código QR detectado');
                await sendQRByEmail(qr);
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('Conexión cerrada debido a:', lastDisconnect?.error?.message);
                
                if (shouldReconnect) {
                    if (connectionAttempts < MAX_RETRIES) {
                        connectionAttempts++;
                        console.log(`🔄 Reconectando (${connectionAttempts}/${MAX_RETRIES})...`);
                        setTimeout(connectToWhatsApp, 5000);
                    } else {
                        console.log('❌ Máximo de intentos alcanzado');
                        process.exit(1);
                    }
                } else {
                    console.log('❌ Sesión cerrada, necesita nuevo QR');
                    // Limpiar archivos de sesión
                    clearSessionFiles();
                }
            } else if (connection === 'open') {
                console.log('✅ Conexión establecida exitosamente!');
                connectionAttempts = 0;
                await cleanupOldSessions();
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m.message) return;

            try {
                const mentionedJids = m.message?.extendedTextMessage?.contextInfo?.mentionedJid;
                if (mentionedJids && mentionedJids.length > 0) {
                    console.log('Menciones detectadas:', mentionedJids);
                    await handleMention(sock, m);
                    return;
                }

                const messageType = Object.keys(m.message)[0];
                const text = messageType === 'conversation' ? m.message.conversation :
                            messageType === 'extendedTextMessage' ? m.message.extendedTextMessage.text :
                            (messageType === 'imageMessage' || messageType === 'videoMessage') ? 
                            m.message[messageType].caption || '' : '';

                if (!text) return;

                const args = text.toLowerCase().trim().split(/\s+/);
                const command = args[0];

                console.log('Mensaje recibido:', { 
                    text,
                    command, 
                    args, 
                    messageType,
                    sender: m.key.participant || m.key.remoteJid
                });

                try {
                    if (command.startsWith('!')) {
                        const adminCommandsList = ['!kick', '!promote', '!demote', '!sleep', '!wake', '!maintenance', '!status'];
                        if (adminCommandsList.includes(command)) {
                            console.log('Procesando comando admin:', command);
                            await adminCommands(sock, m, args);
                            return;
                        }

                        await handleRegularCommands(sock, m, command, args);
                    }
                } catch (error) {
                    console.error('Error procesando comando:', error);
                    await sock.sendMessage(m.key.remoteJid, { 
                        text: '❌ Ocurrió un error al procesar el comando' 
                    }).catch(console.error);
                }
            } catch (error) {
                console.error('Error procesando mensaje:', error);
            }
        });

        sock.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantsUpdate(sock, update);
        });

    } catch (err) {
        console.error('Error de conexión:', err);
        if (connectionAttempts < MAX_RETRIES) {
            setTimeout(connectToWhatsApp, 5000);
        }
    }
}

// Función para limpiar sesiones antiguas
async function cleanupOldSessions() {
    try {
        const sessions = fs.readdirSync(AUTH_DIR);
        const currentTime = Date.now();
        
        for (const file of sessions) {
            const filePath = path.join(AUTH_DIR, file);
            const stats = fs.statSync(filePath);
            const fileAge = currentTime - stats.mtimeMs;
            
            // Eliminar archivos más antiguos de 24 horas
            if (fileAge > 24 * 60 * 60 * 1000) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Sesión antigua eliminada: ${file}`);
            }
        }
    } catch (error) {
        console.error('Error limpiando sesiones:', error);
    }
}

// Función para limpiar archivos de sesión
function clearSessionFiles() {
    try {
        fs.readdirSync(AUTH_DIR).forEach(file => {
            const filePath = path.join(AUTH_DIR, file);
            fs.unlinkSync(filePath);
            console.log(`🗑️ Archivo de sesión eliminado: ${file}`);
        });
    } catch (error) {
        console.error('Error limpiando archivos de sesión:', error);
    }
}

async function handleRegularCommands(sock, m, command, args) {
    switch(command) {
        case '!help':
            await showHelp(sock, m.key.remoteJid);
            break;
        case '!links':
            await showLinks(sock, m.key.remoteJid);
            break;
        case '!addlink':
            if (args.length >= 3) {
                await addLink(sock, m.key.remoteJid, args[1], args[2]);
            } else {
                await sock.sendMessage(m.key.remoteJid, { 
                    text: '❌ Uso correcto: !addlink nombre url' 
                });
            }
            break;
        case '!schedule':
            await sendSchedule(sock, m.key.remoteJid);
            break;
        case '!ping':
            await sendPing(sock, m.key.remoteJid);
            break;
        case '!programar':
            await handleScheduleMessage(sock, m);
            break;
        case '!code':
        case '!js':
            const messageType = Object.keys(m.message)[0];
            let code = '';
            
            if (messageType === 'conversation') {
                code = m.message.conversation.split('\n').slice(1).join('\n');
            } else if (messageType === 'extendedTextMessage') {
                code = m.message.extendedTextMessage.text.split('\n').slice(1).join('\n');
            }
            
            if (!code) {
                await sock.sendMessage(m.key.remoteJid, { 
                    text: '❌ Por favor, proporciona el código a ejecutar. Ejemplo:\n!code\nconsole.log("Hello World!");' 
                });
                return;
            }
            
            await executeCode(sock, m, code);
            break;
        case '!groups':
            await listGroups(sock, m);
            break;
        case '!news':
            await sendNewsToGroup(sock, m, args);
            break;
        case '!poll':
            await createPoll(sock, m, args);
            break;
        case '!vote':
            await vote(sock, m, args);
            break;
        case '!setwelcome':
            await setWelcome(sock, m, args);
            break;
        case '!reminder':
            await setReminder(sock, m, args);
            break;
        case '!docs':
            await searchDocs(sock, m, args);
            break;
        case '!github':
            await searchGithub(sock, m, args);
            break;
        case '!example':
            await codeExample(sock, m, args);
            break;
    }
}

connectToWhatsApp();

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);
