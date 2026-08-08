function requireAuth() {
  return (req, res, next) => {
    // சரியான UUID பார்மட்டில் டெஸ்ட் ஐடி கொடுக்கிறோம்
    req.user = { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', accessToken: 'mock-token' };
    next();
  };
}

module.exports = { requireAuth };