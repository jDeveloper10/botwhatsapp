const activePolls = new Map();

const createPoll = async (client, message, args) => {
    const chatId = message.key.remoteJid;
    const title = args[1];
    const options = args.slice(2);
    
    if (!title || options.length < 2) {
        await client.sendMessage(chatId, { 
            text: '❌ Uso: !poll título opción1 opción2 ...' 
        });
        return;
    }

    const poll = {
        title,
        options,
        votes: new Map(),
        voters: new Set()
    };

    activePolls.set(chatId, poll);

    let pollMessage = formatPollMessage(title, options);

    await client.sendMessage(chatId, { text: pollMessage });
};

const vote = async (client, message, args) => {
    const chatId = message.key.remoteJid;
    const poll = activePolls.get(chatId);
    const voter = message.key.participant || message.key.remoteJid;

    if (!poll) {
        await client.sendMessage(chatId, { text: '❌ No hay votación activa' });
        return;
    }

    const voteNumber = parseInt(args[1]);
    if (isNaN(voteNumber) || voteNumber < 1 || voteNumber > poll.options.length) {
        await client.sendMessage(chatId, { text: '❌ Opción inválida' });
        return;
    }

    if (poll.voters.has(voter)) {
        await client.sendMessage(chatId, { text: '❌ Ya has votado' });
        return;
    }

    const option = poll.options[voteNumber - 1];
    poll.votes.set(option, (poll.votes.get(option) || 0) + 1);
    poll.voters.add(voter);

    let results = formatResults(poll);

    await client.sendMessage(chatId, { text: results });
};

const formatPollMessage = (title, options) => {
    return `┌──『 *📊 VOTACIÓN* 』
├ *Tema:* ${title}
│
${options.map((opt, i) => `├ *${i + 1}.* ${opt}`).join('\n')}
│
└ Vota usando: !vote número`;
};

const formatResults = (poll) => {
    const total = Array.from(poll.votes.values()).reduce((a, b) => a + b, 0);
    return `┌──『 *📊 RESULTADOS* 』
├ *${poll.title}*
│
${poll.options.map(opt => {
    const votes = poll.votes.get(opt) || 0;
    const percentage = total ? Math.round((votes / total) * 100) : 0;
    const bar = '█'.repeat(Math.floor(percentage/10)) + '░'.repeat(10 - Math.floor(percentage/10));
    return `├ ${opt}
├ ${bar} ${votes} votos (${percentage}%)`;
}).join('\n│\n')}
└──────────────`;
};

module.exports = { createPoll, vote };
