const express = require('express')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
require('dotenv').config()

const router = express.Router()
const prisma = new PrismaClient()

//  LOGIN — generate access + refresh tokens
router.post('/login', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email: req.body.email }
        })

        if (!user) {
            console.log('no user found')
            return res.status(401).send({ msg: "Authentication failed" })
        }

        const match = await bcrypt.compare(req.body.password, user.password)
        if (!match) {
            console.log('bad password')
            return res.status(401).send({ msg: "Authentication failed" })
        }

        // Access token (short lifespan)
        const accessToken = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        )

        // Refresh token (long lifespan)
        const refreshToken = crypto.randomBytes(64).toString('hex')
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

        // Save refresh token to DB
        await prisma.refreshToken.create({
            data: {
                user_id: user.id,
                token: refreshToken,
                expires_at: expiresAt
            }
        })

        res.json({
            msg: "Login OK",
            accessToken,
            refreshToken
        })
    } catch (err) {
        console.error(err)
        res.status(500).send({ msg: "Server error during login" })
    }
})

// 🧍 CREATE USER
router.post('/', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 12)

        const newUser = await prisma.user.create({
            data: {
                email: req.body.email,
                password: hashedPassword,
                name: req.body.name
            }
        })

        res.json({ msg: "New user created", id: newUser.id })
    } catch (error) {
        console.error(error)
        res.status(500).send({ msg: "Error: Create user failed" })
    }
})

//  REFRESH TOKEN — get new access token
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body

    if (!refreshToken) {
        return res.status(400).json({ msg: "Missing refresh token" })
    }

    const stored = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
    })

    if (!stored || stored.expires_at < new Date()) {
        return res.status(401).json({ msg: "Invalid or expired refresh token" })
    }

    const user = stored.user

    const newAccessToken = jwt.sign(
        {
            sub: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    )

    res.json({
        msg: "Access token refreshed",
        accessToken: newAccessToken
    })
})

//  LOGOUT — invalidate refresh token
router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body

    if (!refreshToken) {
        return res.status(400).json({ msg: "Missing refresh token" })
    }

    await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
    })

    res.json({ msg: "Logged out successfully" })
})

module.exports = router