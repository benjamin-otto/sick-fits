require('dotenv').config({ path: 'variables.env' })
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const createServer = require('./createServer')
const db = require('./db')

const server = createServer()

// Use express middlware to handle cookies (JWT)
server.express.use(cookieParser())

// Decode the JWT so we can get the user ID on each request
server.express.use((req, res, next) => {
  const { token } = req.cookies

  if (token) {
    const { userId } = jwt.verify(token, process.env.APP_SECRET)
    // Put he userId onto the req for future requests to access
    req.userId = userId
  }

  next()
})

// Add the user data to each request
server.express.use(async (req, res, next) => {
  if (!req.userId) return next()

  const user = await db.query.user(
    { where: { id: req.userId } },
    '{ id, email, name, permissions }'
  )

  req.user = user

  next()
})



server.start(
  {
    cors: {
      credentials: true,
      origin: process.env.FRONTEND_URL,
    },
  },
  deets => {
    console.log(`Server is now running on port http:/localhost:${deets.port}`);
  }
);