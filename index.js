const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const API_KEY = process.env.API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

const OWNER = "628xxx"; // JANGAN LUPA GANTI NOMOR KAMU YA

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ auth: state });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log("QR DITERIMA! KIRIM KE OWNER...");
            // Kirim QR ke nomor kamu via WhatsApp
            await sock.sendMessage(OWNER + "@s.whatsapp.net", { 
                text: `Scan QR ini ya sayang buat nyalain Aira 🥺\n\n${qr}` 
            }).catch(() => {
                console.log("Belum bisa kirim WA. Scan manual di logs:");
                qrcode.generate(qr, { small: true });
            });
        }

        if(connection === 'close') {
            if((lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Aira Pacar + Keuangan udah online!')
            await sock.sendMessage(OWNER + "@s.whatsapp.net", { text: "Aira udah online sayang! 🥰" });
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!text) return;

        const sender = msg.key.remoteJid.split('@')[0];
        let reply = '';

        if (sender === OWNER && text.startsWith('.catat')) {
            fs.appendFileSync('catatan.txt', text.replace('.catat ', '') + '\n');
            reply = 'Udah Aira catet ya sayang 🥰';
        } else {
            const prompt = `Kamu Aira, pacar virtual yg manja, perhatian, dan lucu. Jawab chat ini: ${text}`;
            const result = await model.generateContent(prompt);
            reply = result.response.text();
        }
        await sock.sendMessage(msg.key.remoteJid, { text: reply });
    });
}
startBot();
