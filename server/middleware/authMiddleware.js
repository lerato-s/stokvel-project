const jwt = require("jsonwebtoken")

const protect = (req, res, next) => {
  const header = req.headers.authorization

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "No token provided",
    })
  }

  try {
    const token = header.split(" ")[1]

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.userId = decoded.id

    next()
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    })
  }
}

module.exports = protect