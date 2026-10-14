const express = require("express");
const https = require("https");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

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
// Start Express server
// --------------------------------------------------

app.listen(PORT, () => {

    console.log(
        `Express server running at http://localhost:${PORT}`
    );

});