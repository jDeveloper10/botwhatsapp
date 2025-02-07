const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const webp = require('node-webpmux');
const sharp = require('sharp');

const TEMP_DIR = path.join(__dirname, '../../temp');

async function createSticker(sock, message) {
    try {
        const messageType = Object.keys(message.message)[0];
        const isVideo = messageType === 'videoMessage';
        const isImage = messageType === 'imageMessage';

        if (!isVideo && !isImage) {
            await sock.sendMessage(message.key.remoteJid, { 
                text: '❌ Envía una imagen o video con el comando !sticker' 
            });
            return;
        }

        // Notify processing
        await sock.sendMessage(message.key.remoteJid, { 
            text: '⏳ Procesando sticker...' 
        });

        // Download media
        const buffer = await downloadMediaMessage(message, 'buffer', {});
        const tempFile = path.join(TEMP_DIR, `temp_${Date.now()}`);
        const outputFile = `${tempFile}.webp`;

        if (isImage) {
            // Process image
            await sharp(buffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .toFile(outputFile);
        } else {
            // Process video
            fs.writeFileSync(`${tempFile}.mp4`, buffer);
            await new Promise((resolve, reject) => {
                ffmpeg(`${tempFile}.mp4`)
                    .setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path)
                    .setFfprobePath(require('@ffprobe-installer/ffprobe').path)
                    .outputOptions([
                        "-vcodec", "libwebp",
                        "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse",
                        "-loop", "0",
                        "-ss", "00:00:00",
                        "-t", "00:00:10",
                        "-preset", "default",
                        "-an",
                        "-vsync", "0"
                    ])
                    .toFormat('webp')
                    .save(outputFile)
                    .on('end', resolve)
                    .on('error', reject);
            });
            fs.unlinkSync(`${tempFile}.mp4`);
        }

        // Send sticker
        await sock.sendMessage(message.key.remoteJid, { 
            sticker: fs.readFileSync(outputFile)
        });

        // Cleanup
        fs.unlinkSync(outputFile);

    } catch (error) {
        console.error('Error creating sticker:', error);
        await sock.sendMessage(message.key.remoteJid, { 
            text: '❌ Error al crear el sticker' 
        });
    }
}

module.exports = {
    createSticker
};
