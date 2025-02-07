const fs = require('fs');
const path = require('path');

const LINKS_FILE = path.join(__dirname, '../data/links.json');

// Ensure links file exists
if (!fs.existsSync(LINKS_FILE)) {
    fs.writeFileSync(LINKS_FILE, JSON.stringify({ links: [] }, null, 2));
}

async function showLinks(sock, jid) {
    try {
        const data = JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
        if (data.links.length === 0) {
            await sock.sendMessage(jid, { text: '❌ No hay links guardados.' });
            return;
        }

        let message = '🔗 *Links Guardados:*\n\n';
        data.links.forEach((link, index) => {
            message += `${index + 1}. *${link.name}*\n${link.url}\n\n`; // Fixed missing backtick
        });

        await sock.sendMessage(jid, { text: message });
    } catch (error) {
        console.error('Error al mostrar links:', error);
        await sock.sendMessage(jid, { text: '❌ Error al mostrar los links.' });
    }
}

async function addLink(sock, jid, name, url) {
    try {
        const data = JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
        data.links.push({ name, url });
        fs.writeFileSync(LINKS_FILE, JSON.stringify(data, null, 2));
        await sock.sendMessage(jid, { text: '✅ Link agregado correctamente.' });
    } catch (error) {
        console.error('Error al agregar link:', error);
        await sock.sendMessage(jid, { text: '❌ Error al agregar el link.' });
    }
}

module.exports = {
    showLinks,
    addLink
};
