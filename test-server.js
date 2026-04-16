const express = require('express');
const app = express();

app.get('/health', (req, res) => {
    res.json({ ok: true });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Replace this with your real DB lookup
        const user = await db.users.findOne({ email });

        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.json({
            id: user.id,
            email: user.email,
            role: user.role
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});


app.listen(3001, () => {
    console.log('Test server running on port 3001');
});