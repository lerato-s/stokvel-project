const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  auth0Id: { type: String, unique: true, sparse: true, index: true },

  provider: { 
    type: String, 
    enum: ['google', 'microsoft', 'auth0', 'local'], 
    default: 'local' 
  },

  fullName: { type: String },

  avatarUrl: { type: String },

  lastLogin: { type: Date, default: Date.now },

  username: { type: String, unique: true, sparse: true },

  email: { type: String, required: true, unique: true },

  password: { type: String },

  role: { 
    type: String, 
    enum: ['admin', 'member', 'treasurer'], 
    default: 'member' 
  },

  resetToken: { type: String, default: null },

  resetTokenExpiry: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now }

});


// ========================
// PASSWORD HASHING
// ========================

userSchema.pre('save', async function() {

  if (this.isModified('password') && this.password) {

    const salt = await bcrypt.genSalt(10);

    this.password = await bcrypt.hash(this.password, salt);

  }

});


// ========================
// PASSWORD MATCH
// ========================

userSchema.methods.matchPassword = async function(enteredPassword) {

  if (!this.password) return false;

  return await bcrypt.compare(enteredPassword, this.password);

};


// ========================
// USERNAME GENERATOR
// ========================

async function ensureUniqueUsername(base, model) {

  let username = base;

  let exists = await model.findOne({ username });

  let counter = 1;

  while (exists) {

    username = `${base}_${counter++}`;

    exists = await model.findOne({ username });

  }

  return username;

}


function getUsernameBase(auth0Id, email, name) {

  if (email && !email.includes('@noemail.local')) {

    const prefix = email.split('@')[0];

    if (prefix) return prefix.toLowerCase().replace(/[^a-z0-9_]/g, '');

  }

  if (name && name !== 'google-oau' && name !== 'microsoft-oau') {

    const base = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (base && base.length > 2) return base;

  }

  const match = auth0Id.match(/\|(\d+)/);

  if (match && match[1]) return match[1];

  return 'user';

}


// ========================
// AUTH0 FIND OR CREATE
// ========================

userSchema.statics.findOrCreateFromAuth0 = async function(auth0Id, email, name, picture, provider) {

  if (!auth0Id) throw new Error('auth0Id is required');

  const safeEmail = email || `${auth0Id}@noemail.local`;

  // 1️⃣ Try find by auth0Id
  let user = await this.findOne({ auth0Id });

  if (user) {

    user.lastLogin = new Date();

    if (name && !user.fullName) user.fullName = name;

    if (picture && !user.avatarUrl) user.avatarUrl = picture;

    if (provider && !user.provider) user.provider = provider;

    await user.save();

    return user;

  }


  // 2️⃣ Try link existing account by email
  if (email && !email.includes('@noemail.local')) {

    user = await this.findOne({ email });

    if (user) {

      user.auth0Id = auth0Id;

      user.provider = provider;

      user.lastLogin = new Date();

      if (!user.username) {

        const base = getUsernameBase(auth0Id, user.email, user.fullName);

        user.username = await ensureUniqueUsername(base, this);

      }

      await user.save();

      return user;

    }

  }


  // 3️⃣ Create new user
  const base = getUsernameBase(auth0Id, safeEmail, name);

  const uniqueUsername = await ensureUniqueUsername(base, this);


  try {

    const newUser = new this({

      auth0Id,

      email: safeEmail,

      fullName: name || base,

      avatarUrl: picture || '',

      provider,

      username: uniqueUsername,

      role: 'member',

      lastLogin: new Date()

    });

    await newUser.save();

    return newUser;

  } catch (error) {

    // Fix duplicate race condition
    if (error.code === 11000) {

      return await this.findOne({ auth0Id });

    }

    throw error;

  }

};


module.exports = mongoose.model('Users', userSchema);