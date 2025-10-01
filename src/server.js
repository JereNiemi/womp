const express = require('express')
const cors = require('cors')

// 1. IMPORT THE AUTHORIZE MIDDLEWARE
const authorize = require('./authorize') 

require('dotenv').config()

const app = express()
// app.use(cors()) // It's better to configure CORS more strictly for production
app.use(cors({ origin: '*' })) // Using '*' for development simplicity

const PORT = process.env.PORT || 8080

console.log(`Node.js ${process.version}`)

app.use(express.json())

app.get('/', (req, res) => {
    res.json({ msg: "Test meddelande" })
})

const notesRouter = require('./routes/notes')
// 2. APPLY THE AUTHORIZE MIDDLEWARE TO PROTECTED ROUTES
app.use('/notes', authorize, notesRouter)

const usersRouter = require('./routes/users')
// The /users route contains the public /login and /register endpoints, so it should NOT use 'authorize' here
app.use('/users', usersRouter)


app.listen(PORT, () => {
    try {
        console.log(`Running on http://localhost:${PORT}`)
    } catch (error) {
        // Note: The try/catch block inside app.listen is generally not the correct way to handle server start errors.
        // Server start errors (like EADDRINUSE) should be handled by listening to the 'error' event on the server.
        console.error("Server failed to start:", error.message)
        process.exit(1)
    }
    
})