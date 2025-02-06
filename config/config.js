const config = {
    prefix: '!',
    maxMessagesPerDay: 6,
    welcomeMessage: '¡Bienvenido al grupo de programación! 👨‍💻',
    goodbyeMessage: '¡Hasta pronto! Esperamos verte de nuevo 👋',
    adminNumber: '5491234567890@s.whatsapp.net', // Tu número
    supportMessages: {
        horarios: 'Los horarios de clase son:\n[Lista de horarios]',
        recursos: 'Enlaces útiles:\n- GitHub: [link]\n- Documentación: [link]',
        ayuda: 'Comandos disponibles:\n!sticker - Crear sticker\n!activar - Activar bot\n!programar - Programar mensaje',
        preguntas: {
            horario: {
                pregunta: ['horario', 'clase', 'cuando', 'hora'],
                respuesta: 'Las clases son:\nLunes y Miércoles: 18:00-20:00\nSábados: 10:00-12:00'
            },
            recursos: {
                pregunta: ['material', 'recursos', 'links', 'documentacion'],
                respuesta: 'Recursos disponibles:\n- Documentación: docs.ejemplo.com\n- Repositorio: github.com/ejemplo\n- Videos: youtube.com/ejemplo'
            },
            evaluacion: {
                pregunta: ['examen', 'evaluacion', 'nota', 'aprobar'],
                respuesta: 'La evaluación consiste en:\n1. Proyecto Final (60%)\n2. Ejercicios prácticos (40%)'
            }
        }
    }
};

module.exports = config;
