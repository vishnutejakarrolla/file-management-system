const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

const verifyToken = (req, res, next) => {
    let token = req.headers['authorization'];
    
    if (!token && req.query.token) {
        token = `Bearer ${req.query.token}`;
    }
    
    if (!token) {
        return res.status(403).json({ success: false, msg: 'A token is required for authentication' });
    }
    
    try {
        const tokenString = token.startsWith('Bearer ') ? token.split(" ")[1] : token;
        const decoded = jwt.verify(tokenString, JWT_SECRET); 
        req.user = decoded;
    } catch (err) {
        return res.status(401).json({ success: false, msg: 'Invalid Token' });
    }
    return next();
};

module.exports = { verifyToken, JWT_SECRET };
