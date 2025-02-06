class AdminCommands {
    constructor(sock) {
        this.sock = sock;
    }

    async broadcast(groupId, message) {
        await this.sock.sendMessage(groupId, { text: message });
    }

    async blockUser(userId) {
        await this.sock.updateBlockStatus(userId, "block");
    }
}

module.exports = AdminCommands;
