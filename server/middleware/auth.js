const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        console.log("Authentication failed: No token provided");
        return res.status(401).json({
            success: false,
            error: "Access token is required"
        });
    }

    try {
        // Use JWT_SECRET from environment or fallback
        const secret = process.env.JWT_SECRET || "your-secret-key";
        
        const decoded = jwt.verify(token, secret);
        console.log("Token verified, user ID:", decoded.id);
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        return res.status(403).json({
            success: false,
            error: "Invalid token",
            details: error.message
        });
    }
};

module.exports = {
    authenticateToken
};
