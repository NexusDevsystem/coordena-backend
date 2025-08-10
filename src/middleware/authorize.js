// backend/src/middleware/authorize.js (ESM)
import jwt from "jsonwebtoken";

export default function authorize(allowedRoles = []) {
  if (typeof allowedRoles === "string") allowedRoles = [allowedRoles];

  return (req, res, next) => {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    try {
      const secret = process.env.JWT_SECRET;
      const decoded = jwt.verify(token, secret);
      req.user = decoded; // id, role, etc.

      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      return next();
    } catch (err) {
      console.error("[authorize] JWT error:", err.message);
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }
  };
}
