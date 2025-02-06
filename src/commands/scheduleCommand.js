async function sendSchedule(sock, jid) {
    const scheduleMessage = `
📅 *Class Schedules* 📅

🕘 *Monday*:
   - 09:00 AM - 10:00 AM: Math 📐
   - 10:15 AM - 11:15 AM: Science 🔬
   - 11:30 AM - 12:30 PM: History 📜

🕘 *Tuesday*:
   - 09:00 AM - 10:00 AM: English 📚
   - 10:15 AM - 11:15 AM: Art 🎨
   - 11:30 AM - 12:30 PM: Physical Education 🏃

🕘 *Wednesday*:
   - 09:00 AM - 10:00 AM: Math 📐
   - 10:15 AM - 11:15 AM: Science 🔬
   - 11:30 AM - 12:30 PM: Music 🎵

🕘 *Thursday*:
   - 09:00 AM - 10:00 AM: English 📚
   - 10:15 AM - 11:15 AM: History 📜
   - 11:30 AM - 12:30 PM: Art 🎨

🕘 *Friday*:
   - 09:00 AM - 10:00 AM: Math 📐
   - 10:15 AM - 11:15 AM: Physical Education 🏃
   - 11:30 AM - 12:30 PM: Science 🔬
    `;
    console.log("Sending schedule message to:", jid);
    try {
        await sock.sendMessage(jid, { text: scheduleMessage });
        console.log("Schedule message sent successfully.");
    } catch (error) {
        console.error("Failed to send schedule message:", error);
    }
}

module.exports = {
    sendSchedule
};
