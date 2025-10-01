const express = require('express')
const cors = require('cors')

// CORRECTED: Import authorize from the src/middleware directory
const authorize = require('./middleware/authorize') 

require('dotenv').config()

const app = express()
app.use(cors({ origin: '*' })) // Recommended: Use explicit CORS configuration

const PORT = process.env.PORT || 8080

console.log(`Node.js ${process.version}`)

app.use(express.json())

app.get('/', (req, res) => {
    res.json({ msg: "API is running and secure" }) // Updated message
})



const usersRouter = require('./routes/users')
app.use('/users', usersRouter)


app.listen(PORT, () => {
    // Simplified the server listener block, as try/catch is generally unnecessary here
    console.log(`Running on http://localhost:${PORT}`)
})