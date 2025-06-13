const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log(`[RoleMiddleware] req.user object:`, req.user); // Log the whole req.user object
    if (!req.user || !req.user.role) {
      console.error("[RoleMiddleware] req.user or req.user.role is undefined.");
      return res
        .status(403)
        .json({ message: "Access Denied: User role not found" });
    }
    console.log(
      `[RoleMiddleware] User role: "${
        req.user.role
      }", Allowed roles: ${allowedRoles.join(", ")}`
    );
    if (!allowedRoles.includes(req.user.role)) {
      console.error(
        `[RoleMiddleware] Access Denied: User role "${
          req.user.role
        }" is not in allowed roles [${allowedRoles.join(", ")}].`
      );
      return res.status(403).json({ message: "Access Denied" });
    }
    console.log(`[RoleMiddleware] Access Granted for role: "${req.user.role}"`);
    next();
  };
};

module.exports = authorizeRoles;
