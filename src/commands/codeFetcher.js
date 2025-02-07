const axios = require('axios');

const searchDocs = async (client, message, args) => {
    const chatId = message.key.remoteJid;
    const query = args.slice(1).join(' ');
    
    if (!query) {
        await client.sendMessage(chatId, { 
            text: `┌──『 *🔍 BÚSQUEDA* 』
├ Uso: !docs [término]
├ Ejemplo: !docs javascript map
└──────────────` 
        });
        return;
    }

    try {
        const response = await axios.get(`https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}`);
        const results = response.data.documents.slice(0, 3);

        let message = `┌──『 *📚 DOCUMENTACIÓN* 』
├ *Búsqueda:* ${query}
│`;

        for (const [index, doc] of results.entries()) {
            const summary = doc.summary.length > 150 ? 
                doc.summary.substring(0, 150) + '...' : 
                doc.summary;

            message += `
├──『 *${index + 1}. ${doc.title}* 』
│ 
├ ${summary.split('\n').join('\n├ ')}
│ 
├ 🔗 ${doc.mdn_url}
${index < results.length - 1 ? '│' : ''}`;
        }

        message += `
└──────────────`;

        await client.sendMessage(chatId, { text: message });
    } catch (error) {
        await client.sendMessage(chatId, { 
            text: `┌──『 *❌ ERROR* 』
├ No se pudo encontrar documentación
└──────────────` 
        });
    }
};

const searchGithub = async (client, message, args) => {
    const chatId = message.key.remoteJid;
    const query = args.slice(1).join(' ');

    if (!query) {
        await client.sendMessage(chatId, { 
            text: `┌──『 *🔍 BÚSQUEDA GITHUB* 』
├ Uso: !github [término]
├ Ejemplo: !github react auth
└──────────────` 
        });
        return;
    }

    try {
        const response = await axios.get(
            `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars`
        );
        
        const repos = response.data.items.slice(0, 3);
        let message = `┌──『 *📦 REPOSITORIOS* 』
├ *Búsqueda:* ${query}
│`;
        
        for (const [index, repo] of repos.entries()) {
            const description = repo.description ? 
                (repo.description.length > 150 ? 
                    repo.description.substring(0, 150) + '...' : 
                    repo.description) : 
                'Sin descripción';

            message += `
├──『 *${index + 1}. ${repo.full_name}* 』
│ 
├ ${description.split('\n').join('\n├ ')}
├ ⭐ ${repo.stargazers_count.toLocaleString()} stars
├ 🔄 ${repo.forks_count.toLocaleString()} forks
├ 🔗 ${repo.html_url}
${index < repos.length - 1 ? '│' : ''}`;
        }

        message += `
└──────────────`;

        await client.sendMessage(chatId, { text: message });
    } catch (error) {
        await client.sendMessage(chatId, { 
            text: `┌──『 *❌ ERROR* 』
├ No se pudieron encontrar repositorios
└──────────────` 
        });
    }
};

const codeExample = async (client, message, args) => {
    const chatId = message.key.remoteJid;
    const language = args[1];
    const concept = args.slice(2).join(' ');

    if (!language || !concept) {
        await client.sendMessage(chatId, { 
            text: '❌ Uso: !example [lenguaje] [concepto]\nEjemplo: !example python list comprehension' 
        });
        return;
    }

    const examples = {
        javascript: {
            'async/await': `async function fetchData() {
    try {
        const response = await fetch('https://api.example.com/data');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
}`,
            'promise': `new Promise((resolve, reject) => {
    // Código asíncrono aquí
    if (success) {
        resolve(result);
    } else {
        reject(error);
    }
})`,
            // Más ejemplos...
        },
        python: {
            'list comprehension': `# Lista de números pares
numbers = [x for x in range(10) if x % 2 == 0]

# Lista de cuadrados
squares = [x**2 for x in range(5)]`,
            // Más ejemplos...
        }
    };

    const example = examples[language]?.[concept] || 
        `Lo siento, no tengo un ejemplo para "${concept}" en ${language}`;

    await client.sendMessage(chatId, { 
        text: `💻 *Ejemplo de ${language} - ${concept}:*\n\`\`\`${language}\n${example}\n\`\`\`` 
    });
};

module.exports = { searchDocs, searchGithub, codeExample };
