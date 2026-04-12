const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const crypto = require('crypto');


require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const uri = process.env.MONGODB_URI;
let db;

//database connection

async function connectDB() {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db('stokvelDB');
    console.log('Connected to database');
}

// Health check endpoint for everyone to use

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});


// forgot password 

app.post('/api/auth/forgot-password', async (req, res) => {
    const email = req.body.email;

    
    // if no email inputed, respond with error message
    if (!email) {
        return res.status(400).json({error: "Email is required"});
    }

    //gotta check if the user exists (already in db) 
    const user = await db.collection('users').findOne({email});

    if (!user){  // user not found => must register first
        return res.status(404).json({
            error: "No account found with this email. Please register first.",
            //redirectTo : "/register"
        });
    }

    // user found and exists, weve gotta send them an email that lets them reset (must make reset endpoint)
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // expires in an hour

    await db.collection('passwordResets').insertOne({
        email, token, expiresAt, createdAt: new Date()
    });

    const passwordLink = `http://localhost:3000/reset-password.html?token=${token}&email=${encodeURIComponent(email)}`;
    console.log(`Reset link for ${email}: ${passwordLink}`);

    res.json({
        message: "Password reset link has been sent to email.", 
        redirectTo: "/reset-password"
    });

});


// reset password post

app.post('/api/auth/reset-password', async (req, res) => {
    
    const email = req.body.email;
    const token = req.body.token;
    const newPassword = req.body.newPassword;

    // no email OR token OR password
    if (!email || !token || !newPassword){
        return res.status(400).json({error : "Email, token and new password are all required"});
    }

    //filter collection, the {$gt : new Date()} means we filter by records where expiresAt is greater than NOW > $gt is the 'Greater than' operator in Mongo 
    const resetReq = await db.collection('passwordResets').findOne({
        email : email, token : token, used : false, expiresAt: {$gt : new Date()}
    });

    // cant be found means link is either invalid or expired
    if (!resetReq){
        return res.status(400).json({error : "Reset link is invalid or expired"});
    }

    // change password in user collection
    await db.collection('users').updateOne(
        {email : email}, {$set: {password: newPassword}}
    );

    res.json({message : "Password has been successfully reset! You can now login."});
})



connectDB().then(() => {
    //console.log('About to start listening...');
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console/log('FATAL ERROR:', err);

});


//});