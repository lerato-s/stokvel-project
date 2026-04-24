
// Auth0 configuration - load from environment variables

module.exports = {
  // Auth0 domain (from .env)
  domain: process.env.AUTH0_DOMAIN,
  
  // API audience (identifier for your API)
  audience: process.env.AUTH0_AUDIENCE,
  
  // Issuer URL for token validation
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  
  // Token signing algorithm
  tokenSigningAlg: 'RS256'
};