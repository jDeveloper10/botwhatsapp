const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

ffmpeg.setFfmpegPath(ffmpegPath);

async function createSticker(sock, message) {
    const jid = message.key.remoteJid;
    const mediaMessage = message.message.imageMessage || message.message.videoMessage;
    let mediaPath = null;
    let stickerPath = null;
    
    if (!mediaMessage) {
        await sock.sendMessage(jid, { 
            text: '❌ Por favor, envía una imagen o video con el comando !sticker como descripción' 
        });
        return;
    }

    try {
        await sock.sendMessage(jid, { 
            text: '⏳ Procesando tu sticker... por favor espera' 
        });

        const mediaBuffer = await downloadMediaMessage(
            message,
            'buffer',
            { },
            { 
                logger: console,
                reuploadRequest: sock.updateMediaMessage
            }
        );

        const tempPath = path.join(__dirname, 'temp');
        stickerPath = path.join(tempPath, 'sticker.webp');
        mediaPath = path.join(tempPath, mediaMessage.mimetype.startsWith('image') ? 'image.jpg' : 'video.mp4');

        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath, { recursive: true });
        }

        fs.writeFileSync(mediaPath, mediaBuffer);

        if (mediaMessage.mimetype.startsWith('image')) {
            await sharp(mediaPath)
                .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .webp({ quality: 80 })
                .toFile(stickerPath);
        } else if (mediaMessage.mimetype.startsWith('video')) {
            await new Promise((resolve, reject) => {
                ffmpeg(mediaPath)
                    .outputOptions([
                        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=black',
                        '-vcodec', 'libwebp',
                        '-lossless', '1',
                        '-qscale', '0',
                        '-preset', 'default',
                        '-loop', '0',
                        '-an', '-vsync', '0',
                        '-s', '512:512'
                    ])
                    .duration(6)
                    .output(stickerPath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });
        }

        const stickerBuffer = fs.readFileSync(stickerPath);
        await sock.sendMessage(jid, { sticker: stickerBuffer });
        await sock.sendMessage(jid, { 
            text: '✅ ¡Sticker creado exitosamente!' 
        });
    } catch (error) {
        console.error("Error al crear sticker:", error);
        await sock.sendMessage(jid, { 
            text: '❌ Error al crear el sticker. Por favor, intenta nuevamente.' 
        });
    } finally {
        // Limpiar archivos temporales
        try {
            if (mediaPath && fs.existsSync(mediaPath)) {
                fs.unlinkSync(mediaPath);
            }
            if (stickerPath && fs.existsSync(stickerPath)) {
                fs.unlinkSync(stickerPath);
            }
        } catch (error) {
            console.error("Error al limpiar archivos temporales:", error);
        }
    }
}

module.exports = {
    createSticker
};
