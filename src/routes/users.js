const express = require('express')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto') // Används för att generera refresh token
require('dotenv').config()

const router = express.Router()
const prisma = new PrismaClient()

// Access token livslängd (kort)
const ACCESS_TOKEN_EXPIRY = '15m' 
// Refresh token livslängd (lång)
const REFRESH_TOKEN_EXPIRY_DAYS = 30
// Token längd i byte
const REFRESH_TOKEN_LENGTH_BYTES = 32

/**
 * Genererar en slumpmässig refresh token-sträng
 */
const generateRefreshToken = () => {
    return crypto.randomBytes(REFRESH_TOKEN_LENGTH_BYTES).toString('hex')
}

/**
 * Skapar en ny Access Token (JWT)
 */
const createAccessToken = (user) => {
    return jwt.sign({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role
    }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

// ------------------------------------------------------------------------------------------------

/**
 * POST /login - Loggar in användaren och utfärdar Access- och Refresh Tokens
 */
router.post('/login', async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { email: req.body.email }
    })

    if (user === null) {
        console.log('no user found')
        return res.status(401).send({ msg: "Authentication failed" })
    }

    const match = await bcrypt.compare(req.body.password, user.password)

    if (!match) {
        console.log('bad password')
        return res.status(401).send({ msg: "Authentication failed" })
    }

    //  Skapa Access Token
    const accessToken = createAccessToken(user)

    //  Skapa Refresh Token
    const refreshTokenString = generateRefreshToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS) // Utgångsdatum om 30 dagar

    try {
        // 3. Spara Refresh Token i databasen
        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshTokenString,
                expires_at: expiresAt
            }
        })

        // Skicka tillbaka tokens till klienten
        res.send({
            msg: "Login OK",
            access_token: accessToken,
            refresh_token: refreshTokenString,
            expires_in_seconds: 900 // Tiden för access token i sekunder (15 min)
        })

    } catch (error) {
        console.error("Error saving refresh token:", error)
        res.status(500).send({ msg: "Error: Login process failed" })
    }
})

// ------------------------------------------------------------------------------------------------

/**
 * POST /refresh - Utfärdar en ny Access Token med hjälp av en Refresh Token
 */
router.post('/refresh', async (req, res) => {
    const { refresh_token } = req.body

    if (!refresh_token) {
        return res.status(400).send({ msg: "Refresh token is required" })
    }

    try {
        //  Hitta refresh token i databasen, inklusive den relaterade användaren
        const tokenRecord = await prisma.refreshToken.findUnique({
            where: { token: refresh_token },
            include: { user: true }
        })

        // Kontrollera om token finns
        if (!tokenRecord) {
            return res.status(401).send({ msg: "Invalid refresh token" })
        }

        const now = new Date()
        //  Kontrollera om token har gått ut
        if (tokenRecord.expires_at < now) {
            // Ta bort den utgångna token från databasen
            await prisma.refreshToken.delete({ where: { id: tokenRecord.id } })
            return res.status(401).send({ msg: "Refresh token expired" })
        }

        // Token är giltig. Skapa en ny Access Token
        const newAccessToken = createAccessToken(tokenRecord.user)

        //Returnera den nya access token
        res.send({
            msg: "New access token granted",
            access_token: newAccessToken,
            expires_in_seconds: 900 // Tiden för access token i sekunder (15 min)
        })

    } catch (error) {
        console.error("Error refreshing token:", error)
        res.status(500).send({ msg: "Error: Token refresh failed" })
    }
})

// ------------------------------------------------------------------------------------------------

/**
 * POST / - Skapar en ny användare 
 */
router.post('/', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 12)

        const newUser = await prisma.user.create({
            data: {
                email: req.body.email,
                password: hashedPassword,
                name: req.body.name,
            }
        })

        res.json({ msg: "New user created", id: newUser.id })

    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: "Error: Create user failed" })
    }
})


module.exports = router