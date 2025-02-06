const fs = require('fs');

class SessionManager {
    static async cleanSession() {
        if (fs.existsSync('./auth_info')) {
            fs.rmSync('./auth_info', { recursive: true, force: true });
            fs.mkdirSync('./auth_info');
        }
    }

    static async createSessionFolder() {
        if (!fs.existsSync('./auth_info')) {
            fs.mkdirSync('./auth_info');
        }
    }
}

module.exports = SessionManager;
