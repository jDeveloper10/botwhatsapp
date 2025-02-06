const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

class StickerCommand {
    constructor(sock) {
        this.sock = sock;
    }

    async create(msg) {
        const media = await downloadMediaMessage(msg, 'buffer', {});
        const sticker = await sharp(media)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();

        return sticker;
    }
}

module.exports = StickerCommand;
