const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

const OWNER_NUMBER = '18093426507';

let settings = { antilinks: false, antispam: false, welcome: false, goodbye: false };

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if(shouldReconnect) startBot();
        } else if(connection === 'open') {
            console.log('✅ Bot conectado');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if(sender.endsWith('@g.us') && text.startsWith('!menu') && msg.key.participant.includes(OWNER_NUMBER)) {
            await sock.sendMessage(sender, { text: `📋 Menú de configuración
1️⃣ Antilinks: ${settings.antilinks ? 'ON' : 'OFF'}
2️⃣ Antispam: ${settings.antispam ? 'ON' : 'OFF'}
3️⃣ Bienvenida: ${settings.welcome ? 'ON' : 'OFF'}
4️⃣ Despedida: ${settings.goodbye ? 'ON' : 'OFF'}

Usa:
!set antilinks on/off
!set antispam on/off
!set welcome on/off
!set goodbye on/off` });
        }

        if(sender.endsWith('@g.us') && text.startsWith('!set') && msg.key.participant.includes(OWNER_NUMBER)) {
            const [ , feature, value ] = text.split(' ');
            if(settings.hasOwnProperty(feature)) {
                settings[feature] = value === 'on';
                await sock.sendMessage(sender, { text: `✅ ${feature} cambiado a ${value.toUpperCase()}` });
            } else {
                await sock.sendMessage(sender, { text: '❌ Opción inválida' });
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();