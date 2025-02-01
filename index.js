const { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    downloadContentFromMessage 
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const pino = require('pino');
const sharp = require('sharp');
const path = require('path');
const schedule = require('node-schedule');

// Configuración básica
const ADMIN_NUMBER = '50768246752';
const logger = pino({ level: 'warn' });
const processedMessages = new Set();
const ALLOWED_GROUPS_FILE = './allowed_groups.json';
const SCHEDULED_MESSAGES_FILE = './scheduled_messages.json';
const COMMAND_PREFIX = '!';
const STICKERS_DIR = './stickers';
const TEMP_DIR = './temp';

// Crear directorios necesarios
[STICKERS_DIR, TEMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// Funciones de utilidad para mensajes programados
const loadScheduledMessages = () => {
    try {
        return fs.existsSync(SCHEDULED_MESSAGES_FILE) 
            ? JSON.parse(fs.readFileSync(SCHEDULED_MESSAGES_FILE, 'utf8')) 
            : [];
    } catch (error) {
        console.error('Error al cargar mensajes programados:', error);
        return [];
    }
};

const saveScheduledMessages = (messages) => {
    try {
        fs.writeFileSync(SCHEDULED_MESSAGES_FILE, JSON.stringify(messages, null, 2));
    } catch (error) {
        console.error('Error al guardar mensajes programados:', error);
    }
};

// Funciones de utilidad para grupos permitidos
const loadAllowedGroups = () => {
    try {
        return fs.existsSync(ALLOWED_GROUPS_FILE) 
            ? JSON.parse(fs.readFileSync(ALLOWED_GROUPS_FILE, 'utf8')) 
            : [];
    } catch (error) {
        console.error('Error al cargar grupos permitidos:', error);
        return [];
    }
};

const saveAllowedGroups = (groups) => {
    try {
        fs.writeFileSync(ALLOWED_GROUPS_FILE, JSON.stringify(groups, null, 2));
    } catch (error) {
        console.error('Error al guardar grupos permitidos:', error);
    }
};

let allowedGroups = loadAllowedGroups();

// Datos del bot
const data = {
    classSchedule: {
        'básico': 'Lunes y Miércoles 18:00-20:00',
        'intermedio': 'Martes y Jueves 18:00-20:00',
        'avanzado': 'Sábados 09:00-13:00'
    },
    links: {
        'material': 'https://ejemplo.com/material',
        'recursos': 'https://ejemplo.com/recursos',
        'ejercicios': 'https://ejemplo.com/ejercicios'
    },
    faqs: {
        'python': '🐍 Python es un lenguaje versátil y fácil de aprender...',
        'javascript': '📜 JavaScript es el lenguaje de la web...',
        'java': '☕ Java es un lenguaje orientado a objetos...',
    }
};

// Funciones de utilidad
const isAdmin = (number) => number.includes(ADMIN_NUMBER);

const parseDateTime = (dateTimeStr) => {
    const [dateStr, timeStr] = dateTimeStr.split(' ');
    const [day, month, year] = dateStr.split('/');
    const [hours, minutes] = timeStr.split(':');
    
    const date = new Date(year, month - 1, day, hours, minutes);
    if (isNaN(date.getTime())) {
        throw new Error('Formato de fecha y hora inválido');
    }
    return date;
};

const downloadMediaMessage = async (message) => {
    const type = Object.keys(message.message)[0];
    const content = message.message[type];
    
    if (!content) throw new Error('No se encontró contenido en el mensaje');

    const stream = await downloadContentFromMessage(content, type.replace('Message', ''));
    let buffer = Buffer.from([]);
    
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    
    return buffer;
};

const convertToSticker = async (imagePath) => {
    const tempFile = path.join(TEMP_DIR, `${Date.now()}.webp`);
    try {
        await sharp(imagePath)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp()
            .toFile(tempFile);
        return tempFile;
    } catch (error) {
        console.error('Error al convertir a sticker:', error);
        throw error;
    }
};

// Comandos de administrador
const adminCommands = {
    agregarhorario: {
        description: 'Agregar nuevo horario (Solo admin)',
        execute: async (sock, jid, msg, sender) => {
            if (!isAdmin(sender)) {
                await sock.sendMessage(jid, { text: '❌ Solo el administrador puede usar este comando.' });
                return;
            }
            const params = msg.message?.conversation?.split(' ') || [];
            if (params.length < 3) {
                await sock.sendMessage(jid, { text: 'Uso: !agregarhorario [nivel] [horario]' });
                return;
            }
            const nivel = params[1];
            const horario = params.slice(2).join(' ');
            data.classSchedule[nivel] = horario;
            await sock.sendMessage(jid, { text: `✅ Horario agregado para ${nivel}` });
        }
    },
    agregarlink: {
        description: 'Agregar nuevo link (Solo admin)',
        execute: async (sock, jid, msg, sender) => {
            if (!isAdmin(sender)) {
                await sock.sendMessage(jid, { text: '❌ Solo el administrador puede usar este comando.' });
                return;
            }
            const params = msg.message?.conversation?.split(' ') || [];
            if (params.length < 3) {
                await sock.sendMessage(jid, { text: 'Uso: !agregarlink [nombre] [url]' });
                return;
            }
            const nombre = params[1];
            const url = params[2];
            data.links[nombre] = url;
            await sock.sendMessage(jid, { text: `✅ Link agregado: ${nombre}` });
        }
    }
};

// Comandos generales
const commands = {
    ...adminCommands,
    horarios: {
        description: '📅 Muestra los horarios de clases',
        execute: async (sock, jid) => {
            const horarios = `*📚 HORARIOS DE CLASES*\n\n${Object.entries(data.classSchedule)
                .map(([nivel, horario]) => `*${nivel.toUpperCase()}*\n📅 ${horario}`)
                .join('\n\n')}`;
            await sock.sendMessage(jid, { text: horarios });
        }
    },
    links: {
        description: '🔗 Muestra los links importantes',
        execute: async (sock, jid) => {
            const linksText = `*🔗 LINKS IMPORTANTES*\n\n${Object.entries(data.links)
                .map(([nombre, url]) => `*${nombre.toUpperCase()}*\n🌐 ${url}`)
                .join('\n\n')}`;
            await sock.sendMessage(jid, { text: linksText });
        }
    },
    faqs: {
        description: '❓ Muestra las preguntas frecuentes',
        execute: async (sock, jid) => {
            const faqsText = `*❓ PREGUNTAS FRECUENTES*\n\n${Object.entries(data.faqs)
                .map(([tema, faq]) => `*${tema.toUpperCase()}*\n📝 ${faq}`)
                .join('\n\n')}`;
            await sock.sendMessage(jid, { text: faqsText });
        }
    },
    sticker: {
        description: '🖼️ Convierte una imagen en sticker',
        execute: async (sock, jid, msg) => {
            try {
                const type = Object.keys(msg.message)[0];
                if (!type.includes('image')) {
                    await sock.sendMessage(jid, { text: '❌ Por favor, envía una imagen con el comando !sticker' });
                    return;
                }

                console.log('Descargando imagen...');
                const buffer = await downloadMediaMessage(msg);
                
                console.log('Guardando imagen temporal...');
                const tempPath = path.join(TEMP_DIR, `${Date.now()}.jpg`); 
                fs.writeFileSync(tempPath, buffer);
                
                console.log('Convirtiendo a sticker...');
                const stickerPath = await convertToSticker(tempPath);
                
                console.log('Enviando sticker...');
                await sock.sendMessage(jid, { 
                    sticker: fs.readFileSync(stickerPath) 
                });
                
                // Limpiar archivos temporales
                fs.unlinkSync(tempPath);
                fs.unlinkSync(stickerPath);
                console.log('Proceso completado');
            } catch (error) {
                console.error('Error al crear sticker:', error);
                await sock.sendMessage(jid, { text: '❌ Error al crear el sticker' });
            }
        }
    },
    programar: {
        description: '📅 Programa un mensaje para enviar en una fecha y hora específica',
        execute: async (sock, jid, msg) => {
            const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
            const parts = content.split('\n');
    
            if (parts.length < 5) {
                await sock.sendMessage(jid, { 
                    text: `❌ Formato incorrecto. Usa:\n!programar\nNúmero (con código de país)\nAño\nMes\nDía\nHora\nMinuto\nTu mensaje aquí`
                });
                return;
            }
    
            const targetNumber = parts[1].trim();
            const year = parseInt(parts[2].trim());
            const month = parseInt(parts[3].trim());
            const day = parseInt(parts[4].trim());
            const hour = parseInt(parts[5].trim());
            const minute = parseInt(parts[6].trim());
            const messageText = parts.slice(7).join('\n').trim();
    
            // Convertir fecha y hora
            const scheduledTime = new Date(year, month - 1, day, hour, minute);
            if (isNaN(scheduledTime) || scheduledTime < new Date()) {
                await sock.sendMessage(jid, { text: `❌ Fecha/hora inválida o ya pasada.` });
                return;
            }
    
            // Programar mensaje
            setTimeout(async () => {
                try {
                    await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, { text: messageText });
                } catch (error) {
                    console.error('Error al enviar mensaje programado:', error);
                }
            }, scheduledTime - new Date());
    
            await sock.sendMessage(jid, { 
                text: `✅ Mensaje programado:\n📅 Fecha: ${day}/${month}/${year}\n⏰ Hora: ${hour}:${minute}\n📞 Para: ${targetNumber}\n💬 Mensaje: ${messageText}`
            });
        }
    },

    vermensajes: {
        description: '📋 Ver todos los mensajes programados',
        execute: async (sock, jid) => {
            const messages = loadScheduledMessages();
            if (messages.length === 0) {
                await sock.sendMessage(jid, { 
                    text: '📭 No hay mensajes programados' 
                });
                return;
            }

            const messagesList = messages
                .map(msg => {
                    const date = new Date(msg.scheduledTime);
                    return `📱 *Para:* ${msg.targetNumber.split('@')[0]}\n📅 *Fecha:* ${date.toLocaleDateString()}\n⏰ *Hora:* ${date.toLocaleTimeString()}\n💬 *Mensaje:* ${msg.message}\n`;
                })
                .join('\n-------------------\n');

            await sock.sendMessage(jid, { 
                text: `*📋 MENSAJES PROGRAMADOS*\n\n${messagesList}`
            });
        }
    },
    cancelar: {
        description: '❌ Cancelar un mensaje programado',
        execute: async (sock, jid, msg) => {
            const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
            const messageId = content.split(' ')[1];

            if (!messageId) {
                await sock.sendMessage(jid, { 
                    text: '❌ Debes proporcionar el ID del mensaje a cancelar' 
                });
                return;
            }

            const messages = loadScheduledMessages();
            const updatedMessages = messages.filter(msg => msg.id !== messageId);

            if (messages.length === updatedMessages.length) {
                await sock.sendMessage(jid, { 
                    text: '❌ No se encontró el mensaje programado' 
                });
                return;
            }

            saveScheduledMessages(updatedMessages);
            await sock.sendMessage(jid, { 
                text: '✅ Mensaje programado cancelado exitosamente' 
            });
        }
    },
    help: {
        description: '🔍 Muestra todos los comandos disponibles',
        execute: async (sock, jid, msg, sender) => {
            const isAdminUser = isAdmin(sender);
            const availableCommands = Object.entries(commands)
                .filter(([cmd, info]) => !adminCommands[cmd] || isAdminUser)
                .map(([cmd, { description }]) => `*${COMMAND_PREFIX}${cmd}*\n└ ${description}`)
                .join('\n\n');
            
            const helpText = `*🤖 COMANDOS DISPONIBLES*\n\n${availableCommands}`;
            await sock.sendMessage(jid, { text: helpText });
        }
    }
};
// Función principal para iniciar el bot
async function startBot() {
    // Crear directorio de autenticación si no existe
    if (!fs.existsSync('./auth_info')) fs.mkdirSync('./auth_info');

    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger,
        browser: ['Programming Class Bot', 'Chrome', '1.0.0'],
    });

    // Mostrar código QR para escanear
    sock.ev.on('qr', qr => qrcode.generate(qr, { small: true }));

    // Manejar actualizaciones de conexión
    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`Conexión cerrada: ${lastDisconnect?.error || 'Razón desconocida'}. Reconectando: ${shouldReconnect}`);
            if (shouldReconnect) {
                await startBot();
            } else {
                console.log('Sesión cerrada. Escanea el código QR.');
                fs.existsSync('./auth_info') && fs.rmSync('./auth_info', { recursive: true, force: true });
                await startBot();
            }
        } else if (connection === 'open') {
            console.log('¡Conexión establecida!');
        }
    });

    // Guardar credenciales cuando se actualicen
    sock.ev.on('creds.update', saveCreds);

    // Cargar y programar mensajes guardados al iniciar el bot
    const scheduledMessages = loadScheduledMessages();
    for (const msg of scheduledMessages) {
        const scheduledTime = new Date(msg.scheduledTime);
        if (scheduledTime > new Date()) {
            schedule.scheduleJob(scheduledTime, async () => {
                try {
                    await sock.sendMessage(msg.targetNumber, { text: msg.message });
                    
                    // Eliminar el mensaje programado después de enviarlo
                    const messages = loadScheduledMessages();
                    const updatedMessages = messages.filter(m => m.id !== msg.id);
                    saveScheduledMessages(updatedMessages);
                } catch (error) {
                    console.error('Error al enviar mensaje programado:', error);
                }
            });
        }
    }

    // Manejar mensajes entrantes
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify' || !messages?.length) return;
        const msg = messages[0];
        
        // Evitar procesar mensajes duplicados o estados
        if (processedMessages.has(msg.key.id) || msg.key.remoteJid === 'status@broadcast') return;

        // Agregar mensaje al conjunto de procesados
        processedMessages.add(msg.key.id);
        setTimeout(() => processedMessages.delete(msg.key.id), 5 * 60 * 1000); // Eliminar después de 5 minutos

        const sender = msg.key.participant || msg.key.remoteJid;
        const content = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || 
                       msg.message?.imageMessage?.caption;

        // Procesar comandos
        if (content && content.startsWith(COMMAND_PREFIX)) {
            const [command, ...args] = content.slice(COMMAND_PREFIX.length).trim().toLowerCase().split(' ');
            if (commands[command]) {
                await commands[command].execute(sock, msg.key.remoteJid, msg, sender);
            } else {
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: '❌ Comando no reconocido. Usa !help para ver los comandos disponibles.'
                });
            }
        }
    });
}

// Iniciar el bot
startBot().catch(err => {
    console.error('Error al iniciar el bot:', err);
    process.exit(1);
});
//
