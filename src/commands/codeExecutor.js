const { VM } = require('vm2');

const executeCode = async (client, message, code) => {
    const chatId = message.key.remoteJid;

    try {
        // Eliminar los backticks y 'js' del código si existen
        code = code.replace(/^```js\n/, '').replace(/```$/, '');

        // Configurar el entorno seguro
        const vm = new VM({
            timeout: 3000, // 3 segundos máximo
            sandbox: {
                console: {
                    log: (...args) => output.push(...args),
                    error: (...args) => output.push(...args),
                },
                Math: Math,
                Date: Date,
                Array: Array,
                Object: Object,
                String: String,
                Number: Number,
                Boolean: Boolean,
                RegExp: RegExp,
            },
        });

        const output = [];
        
        // Ejecutar el código
        const result = vm.run(code);
        
        // Preparar la respuesta
        let response = "📝 *Resultado de la ejecución:*\n\n";
        
        // Agregar salida de console.log si existe
        if (output.length > 0) {
            response += "*Console output:*\n```\n";
            response += output.map(item => String(item)).join('\n');
            response += "\n```\n\n";
        }

        // Agregar el resultado de la evaluación
        response += "*Return value:*\n```\n";
        response += String(result);
        response += "\n```";

        await client.sendMessage(chatId, { text: response });

    } catch (error) {
        const errorMsg = `❌ *Error en la ejecución:*\n\n\`\`\`\n${error.message}\n\`\`\``;
        await client.sendMessage(chatId, { text: errorMsg });
    }
};

const formatCodeResult = (output, result) => {
    return `┌──『 *💻 RESULTADO* 』
│
${output.length ? `├─『 *Console:* 』
${output.map(line => '│ ' + line).join('\n')}
│
` : ''}├─『 *Return:* 』
│ ${result}
└──────────────`;
};

module.exports = { executeCode };
