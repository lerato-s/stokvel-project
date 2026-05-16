const jwt = require("jsonwebtoken")

function authenticate(req, res, next) {

  const token =
    req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      error: "You need to log in first",
    })
  }

  try {

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    )

    req.userId = decoded.id
    req.userRole = decoded.role

    next()

  } catch (error) {

    return res.status(401).json({
      error: "Invalid or expired token",
    })
  }
}

module.exports = authenticate