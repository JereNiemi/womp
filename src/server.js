const express = require('express');
const cors = require('cors');

// Middleware för autentisering (om du använder det någonstans)
const authorize = require('./middleware/authorize');

require('dotenv').config();

const app = express();

// --- CORS ---
// Tillåt alla origin (bra för test). I produktion, ange domän istället för '*'.
app.use(cors({ origin: '*' }));

// --- JSON body parsing ---
app.use(express.json());

// --- Test-route för att verifiera att API:n körs ---
app.get('/', (req, res) => {
    res.json({ msg: "API is running and secure" });
});

// --- Users routes ---
const usersRouter = require('./routes/users');
app.use('/users', usersRouter);

// --- Port ---
const PORT = process.env.PORT || 8080;
console.log(`Node.js ${process.version}`);

// --- Starta servern ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
