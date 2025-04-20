const jwt = require("jsonwebtoken");
const db = require("../db/index");

const authenticateToken = async (req, res, next) => {
    // CRITICAL: Always allow access to public quiz endpoints without authentication
    if (req.path.includes('/api/quizzes/code/') || 
        req.path.includes('/api/quizzes/view/') || 
        req.path.includes('/api/quizzes/share/')) {
        console.log("Public quiz endpoint accessed - bypassing authentication:", req.path);
        return next();
    }

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
        
        // Verify that the user exists in the database using getUser function
        const user = await db.getUser(decoded.id);
        
        if (!user) {
            return res.status(403).json({
                success: false,
                error: "User not found"
            });
        }
        
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
