const fs = require('fs');
const path = require('path');

const SCHEDULE_FILE = path.join(__dirname, '../data/schedule.json');

// Ensure schedule file exists
if (!fs.existsSync(SCHEDULE_FILE)) {
    const defaultSchedule = {
        schedule: []
    };
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(defaultSchedule, null, 2));
}

async function sendSchedule(sock, jid) {
    try {
        const data = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
        
        if (!data.schedule || data.schedule.length === 0) {
            await sock.sendMessage(jid, { text: '❌ No hay horarios programados.' });
            return;
        }

        let message = '📅 *HORARIO DE ACTIVIDADES*\n\n';
        
        data.schedule.forEach(day => {
            message += `*${day.day}*\n`;
            day.activities.forEach(activity => {
                message += `└ ${activity.time} - ${activity.description}\n`;
            });
            message += '\n';
        });

        await sock.sendMessage(jid, { text: message });
    } catch (error) {
        console.error('Error al mostrar horario:', error);
        await sock.sendMessage(jid, { text: '❌ Error al mostrar el horario.' });
    }
}

module.exports = {
    sendSchedule
};
