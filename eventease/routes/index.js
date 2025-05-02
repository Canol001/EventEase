const express = require('express');
const router = express.Router();
const db = require('../models/db'); // Ensure correct path
const multer = require('multer');
const path = require('path');

// ========== Multer Configuration ==========
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads'); // Save uploads to /public/uploads
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});

// File type filter: only allow images
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// ========== Helper Functions ==========
function generateEntryCode(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ========== Routes ==========

router.get('/', (req, res) => {
  try {
    const { search, date, sort } = req.query; // Extract sort from query
    const events = db.prepare('SELECT * FROM events ORDER BY date ASC').all();
    const categories = db.prepare('SELECT * FROM category').all(); // Fetch categories too

    res.render('index', {
      events: events || [],
      categories: categories || [],
      query: req.query, // Pass query to EJS
      sort: sort || 'date', // Default to 'date' if sort is not defined
    });
  } catch (err) {
    console.error('Error fetching events or categories:', err);
    res.status(500).render('error', { message: 'Database error.' });
  }
});



// Event Detail + Booking Form
router.get('/event/:id', (req, res) => {
  const id = req.params.id;
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!event) {
      return res.status(404).render('error', { message: 'Event not found.' });
    }

    const bookings = db.prepare('SELECT seat_number FROM bookings WHERE event_id = ?').all(id);
    const takenSeats = bookings.map(b => b.seat_number);

    res.render('event', { event, takenSeats });
  } catch (err) {
    console.error('Error fetching event details:', err);
    res.status(500).render('error', { message: 'Server error.' });
  }
});

// Show Event Creation Form
router.get('/events/create', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM category').all();
    res.render('create-event', { categories: categories || [] });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).render('error', { message: 'Server error.' });
  }
});

// Handle Event Creation
router.post('/events/create', upload.single('image'), (req, res) => {
  const { name, date, price, total_seats, location, category_id, description } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!name || !date || !price || !total_seats || !location || !category_id || !description || !image) {
    return res.status(400).render('error', { message: 'All fields (including image) are required.' });
  }

  try {
    db.prepare('INSERT INTO events (name, date, price, total_seats, location, category_id, description, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(name, date, price, total_seats, location, category_id, description, image);

    res.redirect('/');
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).render('error', { message: 'Server error while creating event.' });
  }
});

// Handle Booking
router.post('/book', (req, res) => {
  const { eventId, name, seat } = req.body;

  if (!eventId || !name || !seat) {
    return res.status(400).render('error', { message: 'Missing booking details.' });
  }

  try {
    const existingBooking = db.prepare('SELECT * FROM bookings WHERE event_id = ? AND seat_number = ?').get(eventId, seat);
    if (existingBooking) {
      return res.send('Sorry, that seat is already booked.');
    }

    let entryCode;
    do {
      entryCode = generateEntryCode();
    } while (db.prepare('SELECT * FROM bookings WHERE entry_code = ?').get(entryCode)); // Ensure unique entry code

    db.prepare('INSERT INTO bookings (name, seat_number, entry_code, event_id) VALUES (?, ?, ?, ?)')
      .run(name, seat, entryCode, eventId);

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    const otherEvents = db.prepare('SELECT * FROM events WHERE id != ?').all(eventId);

    res.render('bookings', { name, seat, eventId, event, events: otherEvents, entryCode });
  } catch (err) {
    console.error('Error processing booking:', err);
    res.status(500).render('error', { message: 'Error processing booking.' });
  }
});

module.exports = router;
