// Importaciones
const { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    downloadContentFromMessage 
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs').promises;
const fsSync = require('fs');
const pino = require('pino');
const sharp = require('sharp');
const path = require('path');
const schedule = require('node-schedule');

// Configuración
const CONFIG = {
    ADMIN_NUMBER: '50768246752',
    COMMAND_PREFIX: '!',
    DIRS: {
        STICKERS: './stickers',
        TEMP: './temp',
        AUTH: './auth_info'
    },
    FILES: {
        ALLOWED_GROUPS: path.join(__dirname, 'allowed_groups.json'),
        SCHEDULED_MESSAGES: path.join(__dirname, 'scheduled_messages.json'),
        AUTHORIZED_USERS: path.join(__dirname, 'authorized_users.json'),
        WELCOME_MESSAGE: {
            text: `¡Bienvenido/a a nuestro grupo! 🎉\n\n` +
                 `📱 Para usar el bot, primero escribe *!activar*\n` +
                 `📖 Luego usa *!help* para ver todos los comandos disponibles\n\n` +
                 `✨ ¡Esperamos que disfrutes del grupo!`,
            image: path.join(__dirname, 'assets', 'welcome.jpg')
        }
    }
};

// Configuración de logger
const logger = pino({ 
    level: 'warn',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
});

// Cache para mensajes procesados
const messageCache = new Map();

// Utilidades
const utils = {
    async ensureDirectories() {
        for (const dir of Object.values(CONFIG.DIRS)) {
            await fs.mkdir(dir, { recursive: true });
        }
    },

    async loadJsonFile(filepath, defaultValue = []) {
        try {
            const data = await fs.readFile(filepath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.warn(`Error loading ${filepath}: ${error.message}`);
            return defaultValue;
        }
    },

    async saveJsonFile(filepath, data) {
        try {
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
        } catch (error) {
            logger.error(`Error saving ${filepath}: ${error.message}`);
        }
    },

    async downloadMediaMessage(message) {
        const type = Object.keys(message.message)[0];
        const content = message.message[type];
        if (!content) throw new Error('No content found in message');

        const stream = await downloadContentFromMessage(content, type.replace('Message', ''));
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    },

    async convertToSticker(imagePath) {
        const outputPath = path.join(CONFIG.DIRS.TEMP, `${Date.now()}.webp`);
        await sharp(imagePath)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp()
            .toFile(outputPath);
        return outputPath;
    },

    async isAuthorizedUser(number) {
        try {
            if (!number) return false;
            if (isAdmin(number)) return true;
            
            const users = await utils.loadJsonFile(CONFIG.FILES.AUTHORIZED_USERS, []);
            return users.includes(number);
        } catch (error) {
            logger.error(`Error checking authorized user: ${error.message}`);
            return false;
        }
    },

    async addAuthorizedUser(number) {
        try {
            if (!number) throw new Error('Invalid number');
            
            const users = await utils.loadJsonFile(CONFIG.FILES.AUTHORIZED_USERS, []);
            if (!users.includes(number)) {
                users.push(number);
                await utils.saveJsonFile(CONFIG.FILES.AUTHORIZED_USERS, users);
                logger.info(`User authorized: ${number}`);
                return true;
            }
            return false;
        } catch (error) {
            logger.error(`Error adding authorized user: ${error.message}`);
            return false;
        }
    }
};

// Gestor de mensajes programados
class ScheduledMessagesManager {
    constructor(sock) {
        this.sock = sock;
        this.messages = new Map();
    }

    async init() {
        const savedMessages = await utils.loadJsonFile(CONFIG.FILES.SCHEDULED_MESSAGES);
        for (const msg of savedMessages) {
            this.schedule(msg);
        }
    }

    schedule(messageData) {
        const scheduledTime = new Date(messageData.scheduledTime);
        if (scheduledTime <= new Date()) return;

        const job = schedule.scheduleJob(scheduledTime, async () => {
            try {
                await this.sock.sendMessage(messageData.targetNumber, { text: messageData.message });
                this.messages.delete(messageData.id);
                await this.saveMessages();
            } catch (error) {
                logger.error(`Failed to send scheduled message: ${error.message}`);
            }
        });

        this.messages.set(messageData.id, { ...messageData, job });
    }

    async saveMessages() {
        const messages = Array.from(this.messages.values())
            .map(({ job, ...msg }) => msg);
        await utils.saveJsonFile(CONFIG.FILES.SCHEDULED_MESSAGES, messages);
    }
}

// Comandos del bot
// Configuración básica
const processedMessages = new Set();

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
const isAdmin = (number) => number.includes(CONFIG.ADMIN_NUMBER);

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
    activar: {
        description: '🔓 Activa tu acceso al bot',
        execute: async (sock, jid, msg, sender) => {
            const number = sender.split('@')[0];
            
            if (await utils.isAuthorizedUser(number)) {
                await sock.sendMessage(jid, { 
                    text: '✅ Tu número ya está autorizado para usar el bot.' 
                });
                return;
            }

            await utils.addAuthorizedUser(number);
            await sock.sendMessage(jid, { 
                text: '✅ ¡Bienvenido! Tu número ha sido autorizado para usar el bot.\nUsa !help para ver los comandos disponibles.' 
            });
        }
    },
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
                const buffer = await utils.downloadMediaMessage(msg);
                
                console.log('Guardando imagen temporal...');
                const tempPath = path.join(CONFIG.DIRS.TEMP, `${Date.now()}.jpg`); 
                await fs.writeFile(tempPath, buffer);
                
                console.log('Convirtiendo a sticker...');
                const stickerPath = await utils.convertToSticker(tempPath);
                
                console.log('Enviando sticker...');
                await sock.sendMessage(jid, { 
                    sticker: await fs.readFile(stickerPath) 
                });
                
                // Limpiar archivos temporales
                await fs.unlink(tempPath);
                await fs.unlink(stickerPath);
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
    
            // Nuevo formato: !programar número DD/MM/AAAA HH:MM mensaje
            const match = content.match(/!programar\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+(.+)/);
    
            if (!match) {
                await sock.sendMessage(jid, {
                    text: `❌ Formato incorrecto. Usa:\n!programar número DD/MM/AAAA HH:MM mensaje\n\nEjemplo:\n!programar 50768246752 01/02/2025 15:30 Hola, este es un mensaje programado`
                });
                return;
            }
    
            const [_, targetNumber, dateStr, timeStr, messageText] = match;
            const [day, month, year] = dateStr.split('/');
            const [hour, minute] = timeStr.split(':');
    
            // Convertir fecha y hora al formato ISO
            const scheduledTime = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    
            // Verificar si la fecha es válida y futura
            if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
                await sock.sendMessage(jid, { text: `❌ Fecha/hora inválida o ya pasada.` });
                return;
            }
    
            // Calcular el tiempo en milisegundos hasta la fecha programada
            const delay = scheduledTime.getTime() - Date.now();
    
            // Programar el mensaje
            setTimeout(async () => {
                try {
                    await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, { text: messageText });
                } catch (error) {
                    console.error('Error al enviar mensaje programado:', error);
                }
            }, delay);
    
            await sock.sendMessage(jid, {
                text: `✅ Mensaje programado:\n📅 Fecha: ${day}/${month}/${year}\n⏰ Hora: ${hour}:${minute}\n📞 Para: ${targetNumber}\n💬 Mensaje: ${messageText}`
            });
        }
    },
    

    vermensajes: {
        description: '📋 Ver todos los mensajes programados',
        execute: async (sock, jid) => {
            const messages = await utils.loadJsonFile(CONFIG.FILES.SCHEDULED_MESSAGES);
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

            const messages = await utils.loadJsonFile(CONFIG.FILES.SCHEDULED_MESSAGES);
            const updatedMessages = messages.filter(msg => msg.id !== messageId);

            if (messages.length === updatedMessages.length) {
                await sock.sendMessage(jid, { 
                    text: '❌ No se encontró el mensaje programado' 
                });
                return;
            }

            await utils.saveJsonFile(CONFIG.FILES.SCHEDULED_MESSAGES, updatedMessages);
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
                .map(([cmd, { description }]) => `*${CONFIG.COMMAND_PREFIX}${cmd}*\n└ ${description}`)
                .join('\n\n');
            
            const helpText = `*🤖 COMANDOS DISPONIBLES*\n\n${availableCommands}`;
            await sock.sendMessage(jid, { text: helpText });
        }
    }
};
// Agregar la función handleMessage antes de startBot()
async function handleMessage(sock, msg, scheduledMessages) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const content = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text || 
                   msg.message?.imageMessage?.caption;

    if (!content) return;

    // Permitir !activar sin autorización
    if (content.toLowerCase() === '!activar') {
        await commands.activar.execute(sock, msg.key.remoteJid, msg, sender);
        return;
    }

    // Verificar autorización para otros comandos
    if (!await utils.isAuthorizedUser(sender.split('@')[0])) {
        await sock.sendMessage(msg.key.remoteJid, { 
            text: '❌ No estás autorizado para usar el bot.\nUsa !activar para solicitar acceso.' 
        });
        return;
    }

    // Procesar comandos autorizados
    if (content.startsWith(CONFIG.COMMAND_PREFIX)) {
        const [command, ...args] = content.slice(CONFIG.COMMAND_PREFIX.length).trim().toLowerCase().split(' ');
        if (commands[command]) {
            await commands[command].execute(sock, msg.key.remoteJid, msg, sender);
        } else {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Comando no reconocido. Usa !help para ver los comandos disponibles.'
            });
        }
    }
}

// Agregar manejador de eventos de grupo
function setupGroupHandlers(sock) {
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        if (action === 'add') {
            try {
                // Verificar si existe la imagen de bienvenida
                if (!fsSync.existsSync(CONFIG.FILES.WELCOME_MESSAGE.image)) {
                    logger.warn('Welcome image not found');
                    // Enviar solo mensaje si no hay imagen
                    await sock.sendMessage(id, { 
                        text: CONFIG.FILES.WELCOME_MESSAGE.text 
                    });
                    return;
                }

                // Leer la imagen
                const imageBuffer = await fs.readFile(CONFIG.FILES.WELCOME_MESSAGE.image);

                for (const participant of participants) {
                    // Enviar mensaje con imagen
                    await sock.sendMessage(id, {
                        image: imageBuffer,
                        caption: CONFIG.FILES.WELCOME_MESSAGE.text,
                        mentions: [participant] // Mencionar al nuevo participante
                    });
                }
            } catch (error) {
                logger.error('Error sending welcome message:', error);
                // Intentar enviar solo mensaje si falla la imagen
                try {
                    await sock.sendMessage(id, { 
                        text: CONFIG.FILES.WELCOME_MESSAGE.text 
                    });
                } catch (e) {
                    logger.error('Failed to send fallback message:', e);
                }
            }
        }
    });
}

// Función principal para iniciar el bot
async function startBot() {
    try {
        // Crear archivos JSON si no existen
        const defaultFiles = [
            [CONFIG.FILES.SCHEDULED_MESSAGES, '[]'],
            [CONFIG.FILES.ALLOWED_GROUPS, '[]'],
            [CONFIG.FILES.AUTHORIZED_USERS, '[]']  // Agregar archivo de usuarios autorizados
        ];

        for (const [file, defaultContent] of defaultFiles) {
            if (!fsSync.existsSync(file)) {
                fsSync.writeFileSync(file, defaultContent);
                logger.info(`Created file: ${file}`);
            }
        }

        // Crear directorio assets si no existe
        const assetsDir = path.dirname(CONFIG.FILES.WELCOME_MESSAGE.image);
        if (!fsSync.existsSync(assetsDir)) {
            fsSync.mkdirSync(assetsDir, { recursive: true });
            logger.info(`Created directory: ${assetsDir}`);
        }

        await utils.ensureDirectories();
        
        const { state, saveCreds } = await useMultiFileAuthState(CONFIG.DIRS.AUTH);
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger,
            browser: ['Programming Class Bot', 'Chrome', '1.0.0'],
            // Agregar estas configuraciones
            markOnlineOnConnect: true,
            getMessage: async (key) => {
                return { conversation: 'hello' };
            },
            retryRequestDelayMs: 1000,
            // Aumentar timeout
            defaultQueryTimeoutMs: 60_000,
            // Mejorar manejo de conexión
            connectTimeoutMs: 60_000,
            // Configuración para manejo de sesiones
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(
                    message.buttonsMessage 
                    || message.templateMessage
                    || message.listMessage
                );
                if (requiresPatch) {
                    message = {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: {
                                    deviceListMetadataVersion: 2,
                                    deviceListMetadata: {},
                                },
                                ...message,
                            },
                        },
                    };
                }
                return message;
            }
        });

        const scheduledMessages = new ScheduledMessagesManager(sock);
        await scheduledMessages.init();

        // Manejadores de eventos
        sock.ev.on('qr', qr => qrcode.generate(qr, { small: true }));
        sock.ev.on('creds.update', saveCreds);
        
        // Mejorar manejo de eventos de conexión
        sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.info(`Connection closed due to ${lastDisconnect?.error?.message}. Reconnecting: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    // Esperar antes de reconectar
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await startBot();
                } else {
                    logger.info('Connection closed permanently. Cleaning up...');
                    // Limpiar sesión
                    await fs.rm(CONFIG.DIRS.AUTH, { recursive: true, force: true });
                    process.exit(0);
                }
            } else if (connection === 'connecting') {
                logger.info('Connecting to WhatsApp...');
            } else if (connection === 'open') {
                logger.info('Successfully connected to WhatsApp');
            }
        });

        // Manejo de mensajes mejorado con rate limiting
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify' || !messages?.length) return;
            
            const msg = messages[0];
            if (msg.key.remoteJid === 'status@broadcast') return;

            // Rate limiting simple
            const messageId = msg.key.id;
            if (messageCache.has(messageId)) return;
            messageCache.set(messageId, true);
            setTimeout(() => messageCache.delete(messageId), 300000); // 5 minutos

            try {
                await handleMessage(sock, msg, scheduledMessages);
            } catch (error) {
                logger.error(`Error handling message: ${error.message}`);
            }
        });

        // Configurar manejador de grupos
        setupGroupHandlers(sock);

        // Manejar desconexiones inesperadas
        process.on('SIGINT', async () => {
            logger.info('Received SIGINT. Cleaning up...');
            await sock.logout();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            logger.info('Received SIGTERM. Cleaning up...');
            await sock.logout();
            process.exit(0);
        });
    } catch (error) {
        logger.error('Error during initialization:', error);
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 3000));
        await startBot();
    }
}

// Inicio del bot con manejo de errores
startBot().catch(error => {
    logger.fatal(error);
    process.exit(1);
});
