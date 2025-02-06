async function sendSchedule(sock, jid) {
    const scheduleMessage = `
╭━━━《 📚 *HORARIOS DE CLASE* 📚 》━━━╮

🌅 *LUNES*
┃ 09:00 - 10:00 ➟ Matemáticas 📐
┃ 10:15 - 11:15 ➟ Ciencias 🔬
┃ 11:30 - 12:30 ➟ Historia 📜

🌅 *MARTES*
┃ 09:00 - 10:00 ➟ Inglés 🗣️
┃ 10:15 - 11:15 ➟ Arte 🎨
┃ 11:30 - 12:30 ➟ Educación Física 🏃

🌅 *MIÉRCOLES*
┃ 09:00 - 10:00 ➟ Matemáticas 📐
┃ 10:15 - 11:15 ➟ Ciencias 🔬
┃ 11:30 - 12:30 ➟ Música 🎵

🌅 *JUEVES*
┃ 09:00 - 10:00 ➟ Inglés 🗣️
┃ 10:15 - 11:15 ➟ Historia 📜
┃ 11:30 - 12:30 ➟ Arte 🎨

🌅 *VIERNES*
┃ 09:00 - 10:00 ➟ Matemáticas 📐
┃ 10:15 - 11:15 ➟ Educación Física 🏃
┃ 11:30 - 12:30 ➟ Ciencias 🔬

╰━━━━━━━━━━━━━━━━━━━━━━╯
    `;
    try {
        await sock.sendMessage(jid, { text: scheduleMessage });
        console.log("✅ Horario enviado exitosamente.");
    } catch (error) {
        console.error("❌ Error al enviar horario:", error);
    }
}

module.exports = {
    sendSchedule
};
