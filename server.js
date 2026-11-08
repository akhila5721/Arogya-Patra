
require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");
const pdf = require("pdf-parse");
const Tesseract = require("tesseract.js");
const axios = require("axios");
const FormData = require("form-data");

const app = express();
const PORT = 3000;

if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing from .env");
    process.exit(1);
}

if (!process.env.GNANI_API_KEY) {
    console.error("GNANI_API_KEY is missing from .env");
}

const gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const GEMINI_MODEL = "gemini-3.5-flash-lite";

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// DATABASE
// ===============================

const db = new sqlite3.Database(
    path.join(__dirname, "arogya-patra.db")
);

// ===============================
// TABLES
// ===============================

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        user_id TEXT UNIQUE NOT NULL
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        hospital TEXT NOT NULL,
        doctor TEXT NOT NULL,
        test_name TEXT NOT NULL,
        visit_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS report_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        FOREIGN KEY (report_id) REFERENCES reports(id)
    )
`);

// ===============================
// UPLOAD FOLDER
// ===============================

const uploadFolder = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

app.use("/uploads", express.static(uploadFolder));

// ===============================
// MULTER - NORMAL REPORT UPLOADS
// ===============================

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadFolder);
    },

    filename: function(req, file, cb) {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage
});

// ===============================
// MULTER - VOICE RECORDINGS
// ===============================

const voiceUpload = multer({
    storage: multer.diskStorage({
        destination: function(req, file, cb) {
            cb(null, uploadFolder);
        },

        filename: function(req, file, cb) {
            cb(
                null,
                "voice-" +
                Date.now() +
                "-" +
                Math.round(Math.random() * 1000000) +
                ".wav"
            );
        }
    }),

    limits: {
        fileSize: 15 * 1024 * 1024
    },

    fileFilter: function(req, file, cb) {
        const allowedTypes = [
            "audio/wav",
            "audio/x-wav",
            "audio/wave",
            "audio/vnd.wave"
        ];

        if (
            allowedTypes.includes(file.mimetype) ||
            path.extname(file.originalname).toLowerCase() === ".wav"
        ) {
            return cb(null, true);
        }

        cb(new Error("Only WAV voice recordings are accepted."));
    }
});

// ===============================
// CREATE ACCOUNT
// ===============================

app.post("/create-account", (req, res) => {
    const { name, mobile, userId } = req.body;

    if (!name || !mobile || !userId) {
        return res.status(400).json({
            message: "All fields are required."
        });
    }

    db.run(
        `INSERT INTO users (name, mobile, user_id)
         VALUES (?, ?, ?)`,
        [name, mobile, userId],
        function(err) {
            if (err) {
                console.error("Create account error:", err);

                return res.status(400).json({
                    message: "Account could not be created."
                });
            }

            res.json({
                message: "Account created successfully.",
                userId: userId
            });
        }
    );
});

// ===============================
// LOGIN
// ===============================

app.post("/login", (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({
            message: "Arogya Patra ID is required."
        });
    }

    db.get(
        `SELECT * FROM users WHERE user_id = ?`,
        [userId],
        (err, row) => {
            if (err) {
                return res.status(500).json({
                    message: "Database error."
                });
            }

            if (!row) {
                return res.status(401).json({
                    message: "Invalid Arogya Patra ID."
                });
            }

            res.json({
                message: "Login successful.",
                user: row
            });
        }
    );
});

// ===============================
// SAVE REPORT
// ===============================

app.post(
    "/save-report",
    upload.array("reports", 20),
    (req, res) => {
        const {
            userId,
            hospital,
            doctor,
            testName,
            visitDate
        } = req.body;

        if (
            !userId ||
            !hospital ||
            !doctor ||
            !testName ||
            !visitDate
        ) {
            return res.status(400).json({
                message: "All report details are required."
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: "Please select at least one report file."
            });
        }

        db.run(
            `INSERT INTO reports
             (user_id, hospital, doctor, test_name, visit_date)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, hospital, doctor, testName, visitDate],
            function(err) {
                if (err) {
                    return res.status(500).json({
                        message: "Could not save report."
                    });
                }

                const reportId = this.lastID;

                const statement = db.prepare(
                    `INSERT INTO report_files
                     (report_id, file_name, file_path)
                     VALUES (?, ?, ?)`
                );

                req.files.forEach(file => {
                    statement.run(
                        reportId,
                        file.originalname,
                        file.filename
                    );
                });

                statement.finalize(err => {
                    if (err) {
                        return res.status(500).json({
                            message: "Could not save report files."
                        });
                    }

                    res.json({
                        message: "Report saved successfully.",
                        reportName: hospital + "." + testName,
                        reportId: reportId
                    });
                });
            }
        );
    }
);

// ===============================
// FETCH ALL REPORTS
// ===============================

app.get("/fetch-reports/:userId", (req, res) => {
    const userId = req.params.userId;

    const query = `
        SELECT
            r.id AS report_id,
            r.user_id,
            r.hospital,
            r.doctor,
            r.test_name,
            r.visit_date,
            r.created_at,
            f.id AS file_id,
            f.file_name,
            f.file_path
        FROM reports r
        LEFT JOIN report_files f
            ON r.id = f.report_id
        WHERE r.user_id = ?
        ORDER BY r.visit_date DESC, r.id DESC
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({
                message: "Could not fetch reports."
            });
        }

        res.json(rows);
    });
});

// ===============================
// FETCH REPORTS FOR ONE TEST
// ===============================

app.get(
    "/fetch-reports/:userId/test/:testName",
    (req, res) => {
        const userId = req.params.userId;
        const testName = decodeURIComponent(req.params.testName);

        const query = `
            SELECT
                r.id AS report_id,
                r.user_id,
                r.hospital,
                r.doctor,
                r.test_name,
                r.visit_date,
                r.created_at,
                f.id AS file_id,
                f.file_name,
                f.file_path
            FROM reports r
            LEFT JOIN report_files f
                ON r.id = f.report_id
            WHERE r.user_id = ?
              AND LOWER(TRIM(r.test_name)) = LOWER(TRIM(?))
            ORDER BY r.visit_date DESC, r.id DESC
        `;

        db.all(query, [userId, testName], (err, rows) => {
            if (err) {
                return res.status(500).json({
                    message: "Could not fetch test reports."
                });
            }

            res.json(rows);
        });
    }
);

// ===============================
// FETCH TESTS DONE BY PATIENT
// ===============================

app.get("/fetch-tests/:userId", (req, res) => {
    const userId = req.params.userId;

    const query = `
        SELECT
            test_name,
            COUNT(DISTINCT id) AS count,
            MIN(visit_date) AS first_date
        FROM reports
        WHERE user_id = ?
        GROUP BY LOWER(TRIM(test_name))
        ORDER BY first_date ASC
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({
                message: "Could not fetch tests."
            });
        }

        res.json(rows);
    });
});

// ===============================
// EXTRACT TEXT FROM REPORT FILES
// ===============================

async function extractReportText(filePath) {
    const extension = path.extname(filePath).toLowerCase();

    if (extension === ".pdf") {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(dataBuffer);

        return pdfData.text || "";
    }

    const imageExtensions = [
        ".png",
        ".jpg",
        ".jpeg",
        ".bmp",
        ".tiff",
        ".webp"
    ];

    if (imageExtensions.includes(extension)) {
        const result = await Tesseract.recognize(
            filePath,
            "eng"
        );

        return result.data.text || "";
    }

    throw new Error(
        "Unsupported report format. Please use PDF or an image."
    );
}

// ===============================
// AI HEALTH REPORT ASSISTANT
// ===============================

app.post("/ask-report-ai", async (req, res) => {
    try {
        const { userId, reportId, question } = req.body;

        if (!userId || !reportId || !question) {
            return res.status(400).json({
                message: "User ID, report ID and question are required."
            });
        }

        if (String(question).length > 1000) {
            return res.status(400).json({
                message: "Please keep your question under 1000 characters."
            });
        }

        db.all(
            `SELECT
                r.id AS report_id,
                r.user_id,
                r.hospital,
                r.doctor,
                r.test_name,
                r.visit_date,
                f.file_name,
                f.file_path
             FROM reports r
             INNER JOIN report_files f
                ON r.id = f.report_id
             WHERE r.id = ?
               AND r.user_id = ?`,
            [reportId, userId],
            async (err, rows) => {
                try {
                    if (err) {
                        return res.status(500).json({
                            message: "Could not access the report."
                        });
                    }

                    if (!rows || rows.length === 0) {
                        return res.status(404).json({
                            message: "Report not found for this account."
                        });
                    }

                    let extractedContent = "";

                    for (const row of rows) {
                        const fullPath = path.join(
                            uploadFolder,
                            path.basename(row.file_path)
                        );

                        if (!fs.existsSync(fullPath)) {
                            continue;
                        }

                        const text = await extractReportText(fullPath);

                        if (text.trim()) {
                            extractedContent +=
                                "\n\nFile: " + row.file_name +
                                "\n" + text;
                        }
                    }

                    if (!extractedContent.trim()) {
                        return res.status(422).json({
                            message:
                                "No readable text was found. Please check the report file."
                        });
                    }

                    extractedContent = extractedContent.slice(0, 30000);

                    const prompt = `
You are the Arogya Patra AI Health Report Assistant.

Your task is to explain information found in the patient's
provided medical report.

REPORT DETAILS:
Hospital: ${rows[0].hospital}
Doctor: ${rows[0].doctor}
Test: ${rows[0].test_name}
Visit date: ${rows[0].visit_date}

EXTRACTED REPORT CONTENT:
${extractedContent}

PATIENT QUESTION:
${question}

IMPORTANT RULES:
1. Answer using only the information in the supplied report.
2. Do not invent values, test results, dates or medical facts.
3. If the answer is not present, clearly say it is not available
   in this report.
4. Explain medical terms in simple English.
5. Do not diagnose diseases or prescribe medicines.
6. Do not recommend changing treatment.
7. If a value appears abnormal, explain that a doctor should
   interpret it using the patient's clinical context.
8. Keep the answer clear and easy to understand.
`;

                    const response = await gemini.models.generateContent({
                        model: GEMINI_MODEL,
                        contents: prompt
                    });

                    const answerText =
                        response.text ||
                        "I could not generate an answer from this report.";

                    return res.json({
                        message: "Answer generated successfully.",
                        answer: answerText
                    });

                } catch (error) {
                    console.error("Report AI error:", error);

                    return res.status(500).json({
                        message:
                            "Could not read the report or generate an answer."
                    });
                }
            }
        );

    } catch (error) {
        console.error("AI route error:", error);

        res.status(500).json({
            message: "AI assistant error."
        });
    }
});

// ===============================
// GNANI SPEECH TO TEXT
// WAV RECORDING -> PRISMA V3
// ===============================

app.post(
    "/gnani-stt",
    (req, res, next) => {
        voiceUpload.single("audio")(req, res, err => {
            if (err) {
                console.error("Voice upload error:", err.message);

                return res.status(400).json({
                    message: err.message
                });
            }

            next();
        });
    },
    async (req, res) => {
        let uploadedFile = null;

        try {
            if (!process.env.GNANI_API_KEY) {
                return res.status(500).json({
                    message: "Gnani API key is missing from .env."
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    message: "No WAV recording was received."
                });
            }

            uploadedFile = req.file.path;

            console.log("Gnani STT: Received audio file.");
            console.log("Audio MIME type:", req.file.mimetype);
            console.log("Audio size:", req.file.size);

            const form = new FormData();

            form.append(
                "audio_file",
                fs.createReadStream(uploadedFile),
                {
                    filename: "recording.wav",
                    contentType: "audio/wav"
                }
            );

            form.append("model", "prisma-v3.0");
            form.append("language_code", "indic-auto");
            form.append("format", "codemix");

            const response = await axios.post(
                "https://api.vachana.ai/stt/v3",
                form,
                {
                    headers: {
                        ...form.getHeaders(),
                        "X-API-Key-ID": process.env.GNANI_API_KEY
                    },
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                    timeout: 90000
                }
            );

            console.log("Gnani STT response received.");

            const transcript = (
                response.data?.transcript ||
                response.data?.text ||
                ""
            ).trim();

            if (!transcript) {
                console.error("Gnani STT returned no transcript:", response.data);

                return res.status(502).json({
                    message: "Gnani received the recording but returned no transcript."
                });
            }

            return res.json({
                success: true,
                transcript: transcript,
                detectedLanguage:
                    response.data?.detected_language_code || "",
                requestId: response.data?.request_id || ""
            });

        } catch (error) {
            let details = error.message;

            if (error.response?.data) {
                details = typeof error.response.data === "string"
                    ? error.response.data
                    : JSON.stringify(error.response.data);
            }

            console.error("Gnani STT error:", details);

            return res.status(error.response?.status || 500).json({
                message: "Gnani speech recognition failed: " + details
            });

        } finally {
            if (uploadedFile && fs.existsSync(uploadedFile)) {
                fs.unlink(uploadedFile, err => {
                    if (err) {
                        console.error("Could not remove voice file:", err.message);
                    }
                });
            }
        }
    }
);

// ==========================================
// GNANI TEXT TO SPEECH - TIMBRE V2.5
// ==========================================

app.post("/gnani-tts", async (req, res) => {
    try {
        const { text, language } = req.body;

        if (!process.env.GNANI_API_KEY) {
            return res.status(500).json({
                message: "Gnani API key is missing."
            });
        }

        if (!text || !String(text).trim()) {
            return res.status(400).json({
                message: "Text is required."
            });
        }

        console.log("Gnani TTS request received.");

        const response = await axios.post(
            "https://api.vachana.ai/api/v1/tts/sse",
            {
                text: String(text),
                voice: "Nalini",
                model: "timbre-v2.5",
                language: language || "auto",
                audio_config: {
                    bitrate: "128k",
                    container: "mp3",
                    encoding: "linear_pcm",
                    sample_rate: 48000,
                    num_channels: 1,
                    sample_width: 2
                }
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key-ID": process.env.GNANI_API_KEY,
                    "Accept": "text/event-stream"
                },
                responseType: "text",
                timeout: 90000
            }
        );

        const sseData = String(response.data || "");
        const audioChunks = [];

        const events = sseData.split(/\r?\n\r?\n/);

        for (const event of events) {
            const lines = event.split(/\r?\n/);

            const eventName = lines
                .find(line => line.startsWith("event:"))
                ?.slice(6).trim();

            const data = lines
                .filter(line => line.startsWith("data:"))
                .map(line => line.slice(5).trim())
                .join("\n");

            if (!data) continue;

            if (eventName === "error") {
                throw new Error(data);
            }

            // Gnani sends event: chunk with JSON data.
            // The audio is inside the JSON "audio" property.
            if (eventName === "chunk" || eventName === "audio_chunk") {
                let audioBase64 = "";

                try {
                    const parsed = JSON.parse(data);

                    audioBase64 =
                        parsed.audio ||
                        parsed.audio_chunk ||
                        "";
                } catch {
                    // Support raw base64 responses too.
                    audioBase64 = data;
                }

                if (audioBase64) {
                    audioChunks.push(
                        Buffer.from(audioBase64, "base64")
                    );
                }
            }
        }

        if (audioChunks.length === 0) {
            console.error(
                "Gnani response:",
                sseData.slice(0, 2000)
            );

            throw new Error(
                "Gnani returned no usable audio chunks."
            );
        }

        const audio = Buffer.concat(audioChunks);

        console.log(
            "Gnani audio received:",
            audioChunks.length,
            "chunks,",
            audio.length,
            "bytes."
        );

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", audio.length);

        return res.send(audio);

    } catch (error) {
        console.error("Gnani TTS error:", error.message);

        if (!res.headersSent) {
            return res.status(error.response?.status || 500).json({
                message: error.message
            });
        }
    }
});

// ===============================
// FETCH PATIENT PROFILE
// ===============================

app.get("/profile/:userId", (req, res) => {
    const userId = req.params.userId;

    db.get(
        `SELECT name, mobile, user_id FROM users WHERE user_id = ?`,
        [userId],
        (err, user) => {
            if (err) {
                return res.status(500).json({
                    message: "Could not fetch profile."
                });
            }

            if (!user) {
                return res.status(404).json({
                    message: "Patient profile not found."
                });
            }

            res.json(user);
        }
    );
});

// ===============================
// UPDATE PATIENT PROFILE
// ===============================

app.put("/profile/:userId", (req, res) => {
    const userId = req.params.userId;
    const name = String(req.body.name || "").trim();
    const mobile = String(req.body.mobile || "").trim();

    if (!name || !/^\d{10}$/.test(mobile)) {
        return res.status(400).json({
            message: "Enter a valid name and 10-digit mobile number."
        });
    }

    db.run(
        `UPDATE users
         SET name = ?, mobile = ?
         WHERE user_id = ?`,
        [name, mobile, userId],
        function(err) {
            if (err) {
                return res.status(500).json({
                    message: "Could not update profile."
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    message: "Patient account not found."
                });
            }

            res.json({
                success: true,
                message: "Profile updated successfully."
            });
        }
    );
});

// ===============================
// DELETE A REPORT
// ===============================

app.delete("/delete-report/:userId/:reportId", (req, res) => {
    const userId = req.params.userId;
    const reportId = Number(req.params.reportId);

    if (!Number.isInteger(reportId) || reportId <= 0) {
        return res.status(400).json({
            message: "Invalid report ID."
        });
    }

    db.all(
        `SELECT f.file_path
         FROM reports r
         LEFT JOIN report_files f ON r.id = f.report_id
         WHERE r.id = ? AND r.user_id = ?`,
        [reportId, userId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    message: "Could not find the report."
                });
            }

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    message: "Report not found."
                });
            }

            db.run(
                `DELETE FROM report_files WHERE report_id = ?`,
                [reportId],
                function(err) {
                    if (err) {
                        return res.status(500).json({
                            message: "Could not delete report files."
                        });
                    }

                    db.run(
                        `DELETE FROM reports WHERE id = ? AND user_id = ?`,
                        [reportId, userId],
                        function(err) {
                            if (err) {
                                return res.status(500).json({
                                    message: "Could not delete report."
                                });
                            }

                            rows.forEach(row => {
                                if (row.file_path) {
                                    const filePath = path.join(
                                        uploadFolder,
                                        path.basename(row.file_path)
                                    );

                                    fs.unlink(filePath, () => {});
                                }
                            });

                            res.json({
                                success: true,
                                message: "Report deleted successfully."
                            });
                        }
                    );
                }
            );
        }
    );
});

// ===============================
// GENERAL ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {
    console.error("Server error:", err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        message: err.message || "Internal server error."
    });
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
    console.log(
        `Arogya Patra running at http://localhost:${PORT}`
    );
});
