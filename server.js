const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL Database.');
});

// Middleware Setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
    secret: process.env.SESSION_SECRET || 'secretkey',
    resave: false,
    saveUninitialized: false
}));

// Helper: Haversine formula to calculate distance between two GPS coordinates in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

// Routes
app.get('/', (req, res) => {
    res.render('login', { error: null });
});

// Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            const user = results[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                req.session.user = user;
                if (user.role === 'admin') return res.redirect('/admin');
                if (user.role === 'teacher') return res.redirect('/teacher');
                if (user.role === 'student') return res.redirect('/student');
            }
        }
        res.render('login', { error: 'Invalid Email or Password' });
    });
});

// Teacher Dashboard
app.get('/teacher', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'teacher') return res.redirect('/');
    
    db.query('SELECT * FROM subjects WHERE teacher_id = ?', [req.session.user.id], (err, subjects) => {
        if (err) throw err;
        res.render('teacher_dashboard', { user: req.session.user, subjects, qrImage: null, message: null });
    });
});

// Teacher: Generate QR Code for a Subject
app.post('/teacher/generate-qr', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'teacher') return res.redirect('/');
    const { subject_id } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Expires in 5 minutes

    db.query('INSERT INTO active_sessions (subject_id, teacher_id, token, expires_at) VALUES (?, ?, ?, ?)',
        [subject_id, req.session.user.id, token, expiresAt], (err) => {
            if (err) throw err;

            QRCode.toDataURL(token, (err, qrImage) => {
                db.query('SELECT * FROM subjects WHERE teacher_id = ?', [req.session.user.id], (err, subjects) => {
                    res.render('teacher_dashboard', { user: req.session.user, subjects, qrImage, message: 'QR Code generated successfully! Valid for 5 minutes.' });
                });
            });
        });
});

// Student Dashboard
app.get('/student', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') return res.redirect('/');

    db.query(`SELECT s.name as subject_name, a.status, a.timestamp 
              FROM attendance a JOIN subjects s ON a.subject_id = s.id 
              WHERE a.student_id = ?`, [req.session.user.id], (err, history) => {
        if (err) throw err;
        res.render('student_dashboard', { user: req.session.user, history, message: null, error: null });
    });
});

// Student: Verify GPS and Mark Attendance via Scanned Token
app.post('/student/mark-attendance', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') return res.redirect('/');
    const { token, latitude, longitude } = req.body;

    // 1. Check College GPS Boundaries
    db.query('SELECT * FROM college_location LIMIT 1', (err, locResults) => {
        if (err || locResults.length === 0) return res.status(400).send('Location settings error.');
        
        const college = locResults[0];
        const distance = calculateDistance(latitude, longitude, college.latitude, college.longitude);

        if (distance > college.radius_meters) {
            return res.render('student_dashboard', { 
                user: req.session.user, 
                history: [], 
                message: null, 
                error: `Attendance Failed: You are outside the campus boundary (${Math.round(distance)}m away).` 
            });
        }

        // 2. Validate QR Session Token & Expiry
        db.query('SELECT * FROM active_sessions WHERE token = ? AND expires_at > NOW()', [token], (err, sessionResults) => {
            if (err || sessionResults.length === 0) {
                return res.render('student_dashboard', { 
                    user: req.session.user, 
                    history: [], 
                    message: null, 
                    error: 'Invalid or expired QR code.' 
                });
            }

            const activeSession = sessionResults[0];

            // 3. Prevent Duplicate Attendance for the same Subject session
            db.query('SELECT * FROM attendance WHERE student_id = ? AND subject_id = ? AND DATE(timestamp) = CURDATE()', 
                [req.session.user.id, activeSession.subject_id], (err, existing) => {
                    if (existing.length > 0) {
                        return res.render('student_dashboard', { 
                            user: req.session.user, 
                            history: [], 
                            message: null, 
                            error: 'Attendance already marked for this subject today.' 
                        });
                    }

                    // 4. Save Attendance
                    db.query('INSERT INTO attendance (student_id, subject_id, status) VALUES (?, ?, "Present")',
                        [req.session.user.id, activeSession.subject_id], (err) => {
                            if (err) throw err;
                            res.render('student_dashboard', { 
                                user: req.session.user, 
                                history: [], 
                                message: 'Attendance marked successfully!', 
                                error: null 
                            });
                        });
                });
        });
    });
});

// Admin Dashboard
app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/');
    
    db.query('SELECT COUNT(*) as total_students FROM users WHERE role="student"', (err, sCount) => {
        db.query('SELECT COUNT(*) as total_teachers FROM users WHERE role="teacher"', (err, tCount) => {
            db.query('SELECT COUNT(*) as total_subjects FROM subjects', (err, subCount) => {
                res.render('admin_dashboard', { 
                    user: req.session.user, 
                    stats: {
                        students: sCount[0].total_students,
                        teachers: tCount[0].total_teachers,
                        subjects: subCount[0].total_subjects
                    }
                });
            });
        });
    });
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
