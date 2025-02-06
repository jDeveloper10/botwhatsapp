const fs = require('fs');
const path = require('path');

const linksFile = path.join(__dirname, '../data/links.json');

// Asegurar que el directorio data existe
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}

// Crear archivo de links si no existe
if (!fs.existsSync(linksFile)) {
    fs.writeFileSync(linksFile, JSON.stringify({ links: [] }));
}

function loadLinks() {
    return JSON.parse(fs.readFileSync(linksFile, 'utf8'));
}

function saveLinks(links) {
    fs.writeFileSync(linksFile, JSON.stringify(links, null, 2));
}

async function showLinks(sock, jid) {
    try {
        const data = loadLinks();
        if (data.links.length === 0) {
            await sock.sendMessage(jid, { 
                text: '❌ No hay links guardados todavía.' 
            });
            return;
        }

        const linksList = data.links
            .map((link, index) => `${index + 1}. 🔗 *${link.name}*\n   ${link.url}`)
            .join('\n\n');

        const message = `
📑 *Links Guardados* 📑

${linksList}
`;

        await sock.sendMessage(jid, { text: message });
    } catch (error) {
        console.error('Error al mostrar links:', error);
        await sock.sendMessage(jid, { 
            text: '❌ Error al mostrar los links.' 
        });
    }
}

async function addLink(sock, message, args) {
    // Verificar si es admin (puedes ajustar esta lógica según tus necesidades)
    const sender = message.key.remoteJid;
    
    try {
        if (args.length < 3) {
            await sock.sendMessage(sender, { 
                text: '❌ Formato incorrecto. Uso: !addlink nombre url' 
            });
            return;
        }

        const name = args[1];
        const url = args[2];

        // Validar URL
        try {
            new URL(url);
        } catch {
            await sock.sendMessage(sender, { 
                text: '❌ URL inválida.' 
            });
            return;
        }

        const data = loadLinks();
        data.links.push({ name, url });
        saveLinks(data);

        await sock.sendMessage(sender, { 
            text: '✅ Link agregado exitosamente.' 
        });
    } catch (error) {
        console.error('Error al agregar link:', error);
        await sock.sendMessage(sender, { 
            text: '❌ Error al agregar el link.' 
        });
    }
}

module.exports = {
    showLinks,
    addLink
};
