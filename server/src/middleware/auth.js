const adminAuth = (req, res, next) => {
  const adminKey = req.headers["x-admin-key"];
  const expectedKey = process.env.ADMIN_KEY;

  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or missing admin key",
    });
  }

  next();
};

module.exports = {
  adminAuth,
};
