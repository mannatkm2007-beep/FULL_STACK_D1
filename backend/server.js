const express = require("express");
const https = require("https");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { initializeApp } = require("firebase/app");
const {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp
} = require("firebase/firestore");

// Load backend/.env first, then the project root .env (which holds the Firebase keys)
dotenv.config();
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();

const PORT = 3000;

// --------------------------------------------------
// Middleware
// --------------------------------------------------

// Allow React frontend to communicate with Express
app.use(cors());

// Read form data
app.use(express.urlencoded({ extended: true }));

// Read JSON data from React fetch()
app.use(express.json());

// --------------------------------------------------
// Serve frontend files
// --------------------------------------------------

app.use(express.static(path.join(__dirname, "..")));

// --------------------------------------------------
// SendGrid settings
// --------------------------------------------------

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

// Check that environment variables exist
if (!SENDGRID_API_KEY || !FROM_EMAIL) {
    console.log("ERROR: SendGrid environment variables are missing.");
}

// --------------------------------------------------
// Home page
// --------------------------------------------------

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

// --------------------------------------------------
// Signup route
// --------------------------------------------------

app.post("/signup", (req, res) => {

    console.log("Received data:", req.body);

    const fname = req.body.firstName;
    const lname = req.body.lastName;
    const email = req.body.email;

    console.log("First Name:", fname);
    console.log("Last Name:", lname);
    console.log("Email:", email);

    // Validate input
    if (!fname || !lname || !email) {
        return res.status(400).json({
            message: "Please provide first name, last name and email."
        });
    }

    // SendGrid email data
    const data = {
        personalizations: [
            {
                to: [
                    {
                        email: email
                    }
                ],
                subject: "Welcome to DEV@Deakin!"
            }
        ],

        from: {
            email: FROM_EMAIL,
            name: "DEV@Deakin"
        },

        content: [
            {
                type: "text/html",
                value: `
                    <h2>Hey ${fname},</h2>

                    <p>
                        Thanks for subscribing to DEV@Deakin!
                    </p>

                    <p>
                        We'll email you whenever a new
                        project or update goes live.
                    </p>

                    <p>
                        — DEV@Deakin
                    </p>
                `
            }
        ]
    };

    const jsondata = JSON.stringify(data);

    // --------------------------------------------------
    // SendGrid API request
    // --------------------------------------------------

    const options = {
        hostname: "api.sendgrid.com",
        path: "/v3/mail/send",
        method: "POST",

        headers: {
            "Authorization": `Bearer ${SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(jsondata)
        }
    };

    const request = https.request(options, (response) => {

        console.log(
            "SendGrid status code:",
            response.statusCode
        );

        let responseBody = "";

        response.on("data", (chunk) => {
            responseBody += chunk;
        });

        response.on("end", () => {

            console.log(
                "SendGrid response:",
                responseBody || "(empty response)"
            );

            // SendGrid returns 202 when the email is accepted
            if (response.statusCode === 202) {

                console.log(
                    "Welcome email accepted successfully!"
                );

                return res.status(202).json({
                    message: `Welcome ${fname}! Your welcome email has been sent.`
                });

            } else {

                console.log(
                    "SendGrid returned an error:",
                    responseBody
                );

                return res.status(500).json({
                    message: "SendGrid could not send the email."
                });
            }
        });
    });

    // --------------------------------------------------
    // Handle HTTPS errors
    // --------------------------------------------------

    request.on("error", (error) => {

        console.log(
            "Error calling SendGrid:",
            error
        );

        return res.status(500).json({
            message: "Could not connect to SendGrid."
        });
    });

    // Send JSON data to SendGrid
    request.write(jsondata);

    // Finish HTTPS request
    request.end();
});

// --------------------------------------------------
// Firebase (normal client SDK) - same Firestore the frontend used in Task P4
// --------------------------------------------------

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.log("ERROR: JWT_SECRET is missing in backend/.env");
}

// --------------------------------------------------
// Validation schemas (Zod)
// --------------------------------------------------

const registerSchema = z.object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters")
});

const loginSchema = z.object({
    email: z.email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required")
});

const paymentSchema = z.object({
    cardName: z.string().trim().min(2, "Name on card is required"),
    cardNumber: z.string().regex(/^\d{16}$/, "Card number must be 16 digits"),
    expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry must be MM/YY"),
    cvc: z.string().regex(/^\d{3,4}$/, "CVC must be 3 or 4 digits")
});

// --------------------------------------------------
// Helpers
// --------------------------------------------------

// Only send safe fields back to the frontend (never the password hash).
// Users created before subscriptions existed have no "plan" field -> Free.
function publicUser(id, data) {
    return {
        id: id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        plan: data.plan || "free"
    };
}

function signToken(id, email) {
    return jwt.sign({ id: id, email: email }, JWT_SECRET, { expiresIn: "2h" });
}

// Middleware: checks the "Authorization: Bearer <jwt>" header
function verifyToken(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: "Not logged in." });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ message: "Session expired. Please log in again." });
    }
}

// --------------------------------------------------
// Register route
// --------------------------------------------------

app.post("/api/register", async (req, res) => {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    try {
        const email = result.data.email.trim().toLowerCase();

        // Make sure this email isn't already registered
        const existing = await getDocs(
            query(collection(db, "users"), where("email", "==", email))
        );

        if (!existing.empty) {
            return res.status(409).json({
                message: "An account with this email already exists. Please log in."
            });
        }

        // Hash the password (never store plain text)
        const hashedPassword = await bcrypt.hash(result.data.password, 10);

        await addDoc(collection(db, "users"), {
            firstName: result.data.firstName,
            lastName: result.data.lastName,
            email: email,
            password: hashedPassword,
            plan: "free",
            createdAt: serverTimestamp()
        });

        return res.status(201).json({ message: "Account created successfully." });
    } catch (error) {
        console.log("Register error:", error);
        return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
});

// --------------------------------------------------
// Login route -> returns a signed JWT
// --------------------------------------------------

app.post("/api/login", async (req, res) => {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    try {
        const email = result.data.email.trim().toLowerCase();

        const snapshot = await getDocs(
            query(collection(db, "users"), where("email", "==", email))
        );

        if (snapshot.empty) {
            return res.status(401).json({ message: "Incorrect email or password." });
        }

        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        const match = await bcrypt.compare(result.data.password, user.password);

        if (!match) {
            return res.status(401).json({ message: "Incorrect email or password." });
        }

        const token = signToken(userDoc.id, user.email);

        return res.json({
            message: "Login successful.",
            token: token,
            user: publicUser(userDoc.id, user)
        });
    } catch (error) {
        console.log("Login error:", error);
        return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
});

// --------------------------------------------------
// Current user (used to restore the session on page refresh)
// --------------------------------------------------

app.get("/api/me", verifyToken, async (req, res) => {
    try {
        const snap = await getDoc(doc(db, "users", req.user.id));

        if (!snap.exists()) {
            return res.status(404).json({ message: "User not found." });
        }

        return res.json({ user: publicUser(snap.id, snap.data()) });
    } catch (error) {
        console.log("Me error:", error);
        return res.status(500).json({ message: "Something went wrong." });
    }
});

// --------------------------------------------------
// Upgrade plan (logged-in Free users only)
// --------------------------------------------------

app.post("/api/upgrade", verifyToken, async (req, res) => {
    const result = paymentSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({ message: result.error.issues[0].message });
    }

    try {
        const userRef = doc(db, "users", req.user.id);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            return res.status(404).json({ message: "User not found." });
        }

        if ((snap.data().plan || "free") === "paid") {
            return res.status(400).json({ message: "You are already on the Paid plan." });
        }

        // Demo only: payment details are validated but NEVER stored.
        await updateDoc(userRef, {
            plan: "paid",
            upgradedAt: serverTimestamp()
        });

        const updated = await getDoc(userRef);

        return res.json({
            message: "Plan upgraded successfully.",
            user: publicUser(updated.id, updated.data())
        });
    } catch (error) {
        console.log("Upgrade error:", error);
        return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
});

// --------------------------------------------------
// Start Express server
// --------------------------------------------------

app.listen(PORT, () => {

    console.log(
        `Express server running at http://localhost:${PORT}`
    );

});