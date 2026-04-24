const { auth } = require('express-oauth2-jwt-bearer');
const auth0Config = require('../config/auth0');

// Middleware to validate Auth0 JWT token
const authenticate = auth({
  issuerBaseURL: auth0Config.issuerBaseURL,
  audience: auth0Config.audience,
  tokenSigningAlg: 'RS256'
});

// Optional: attach user info to request (userId, email, etc.)
const attachUser = (req, res, next) => {
  if (req.auth && req.auth.payload) {
    req.userId = req.auth.payload.sub;
    req.userEmail = req.auth.payload.email;
    req.userName = req.auth.payload.name;
    // Custom claim for roles (if you set up Auth0 roles)
    req.userRole = req.auth.payload['https://stokvel.com/roles'] || 'MEMBER';
  }
  next();
};

module.exports = { authenticate, attachUser };