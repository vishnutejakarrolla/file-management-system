const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    
    if (!token) {
        return res.status(403).json({ success: false, msg: 'A token is required for authentication' });
    }
    
    try {
        const decoded = jwt.verify(token.split(" ")[1], JWT_SECRET); // Bearer TOKEN
        req.user = decoded;
    } catch (err) {
        return res.status(401).json({ success: false, msg: 'Invalid Token' });
    }
    return next();
};

module.exports = { verifyToken, JWT_SECRET };
