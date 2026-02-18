const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const PORT = 3000;
const EMAIL_USER = "j.joshuasamraj@gmail.com";
const EMAIL_PASS = "gcdw zhyw ljiy wtkk"; 

// Threshold Limits
const LIMITS = {
    temperature: 90.0,
    current: 22.0 
};

// Data Store for History
const machineHistory = {
    "Machine A": [],
    "Machine B": []
};

const alertCooldowns = {}; 

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

// ============================================================
//  API ROUTE: THIS IS WHERE WE RECEIVE & PRINT DATA
// ============================================================
app.post('/api/sensor-data', (req, res) => {
    const { machine_id, temperature, current } = req.body;
    
    // --- NEW LINE: Print the data to the Console ---
    console.log(`📥 RECEIVED: [${machine_id}] Temp: ${temperature}°C | Current: ${current}A`);
    // -----------------------------------------------

    const timestamp = new Date().toLocaleTimeString();
    const dataPoint = { time: timestamp, temperature, current };

    // 1. Update History
    if (!machineHistory[machine_id]) machineHistory[machine_id] = [];
    machineHistory[machine_id].push(dataPoint);
    if (machineHistory[machine_id].length > 50) machineHistory[machine_id].shift();

    // 2. Real-time Push
    io.emit('update_data', { machine_id, ...dataPoint });

    // 3. Alerts
    checkLimitsAndAlert(machine_id, temperature, current);

    res.sendStatus(200);
});

app.get('/check', (req, res) => {
    res.status(200).send("Server is Running!");
});

io.on('connection', (socket) => {
    console.log('Client connected. Sending history...');
    socket.emit('init_history', machineHistory);
});

// --- ALERT LOGIC ---

function checkLimitsAndAlert(machine, temp, curr) {
    const isTempHigh = temp > LIMITS.temperature;
    const isCurrHigh = curr > LIMITS.current;

    if (isTempHigh || isCurrHigh) {
        const now = Date.now();
        if (!alertCooldowns[machine] || now - alertCooldowns[machine] > 60000) {
            console.log(`⚠️ ALERT TRIGGERED for ${machine}! Sending Email...`); // Added Log for Alert
            sendEmailAlert(machine, temp, curr, isTempHigh, isCurrHigh);
            alertCooldowns[machine] = now;
        }
    }
}

function sendEmailAlert(machine, temp, curr, isTempHigh, isCurrHigh) {
    const timestamp = new Date().toLocaleString();

    const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #d32f2f; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ CRITICAL ALERT</h1>
            <p style="margin: 5px 0 0;">Action Required: ${machine}</p>
        </div>
        <div style="padding: 20px; background-color: #fafafa;">
            <p style="font-size: 16px; color: #333;">
                The monitoring system detected sensor readings exceeding safety thresholds. 
                Please inspect <strong>${machine}</strong> immediately.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background-color: #eceff1; color: #333;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Parameter</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Value</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Limit</th>
                        <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;"><strong>Temperature</strong></td>
                        <td style="padding: 12px; color: ${isTempHigh ? '#d32f2f' : '#2e7d32'}; font-weight: bold;">${temp}°C</td>
                        <td style="padding: 12px; color: #555;">${LIMITS.temperature}°C</td>
                        <td style="padding: 12px; text-align: center;">${isTempHigh ? 'CRITICAL' : 'NORMAL'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px;"><strong>Current</strong></td>
                        <td style="padding: 12px; color: ${isCurrHigh ? '#d32f2f' : '#2e7d32'}; font-weight: bold;">${curr} A</td>
                        <td style="padding: 12px; color: #555;">${LIMITS.current} A</td>
                        <td style="padding: 12px; text-align: center;">${isCurrHigh ? 'CRITICAL' : 'NORMAL'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>`;

    const mailOptions = {
        from: `Factory Admin <${EMAIL_USER}>`,
        to: "j.joshuasamraj@gmail.com",
        subject: `🚨 ${machine}: Safety Threshold Exceeded`,
        html: htmlTemplate
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) console.log("Mail Error:", err);
        else console.log(`📧 Email Sent Successfully to ${machine}`);
    });
}

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});