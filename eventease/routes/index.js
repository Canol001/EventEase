const express = require('express');
const router = express.Router();
const db = require('../models/db'); // Ensure the path to your database module is correct
const multer = require('multer');
const path = require('path');

// Homepage - List Events
router.get('/', async (req, res) => {
  try {
    // Fetch events ordered by date
    const events = db.prepare('SELECT * FROM events ORDER BY date ASC').all();
    if (!events || events.length === 0) {
      return res.render('index', { events: [] }); // No events to display
    }
    console.log('Fetched events:', events); // Debug log
    res.render('index', { events });
  } catch (err) {
    console.error("Error fetching events:", err); // Log error
    return res.status(500).send('Database error.');
  }
});

// Event Detail + Booking Form
router.get('/event/:id', async (req, res) => {
  const id = req.params.id;
  try {
    // Fetch the specific event by ID
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
    if (!event) {
      return res.status(404).send("Event not found.");
    }
    console.log('Fetched event:', event); // Debug log

    // Fetch booked seats for the event
    const bookedSeats = db.prepare("SELECT seat_number FROM bookings WHERE event_id = ?").all(id);
    const takenSeats = bookedSeats.map(row => row.seat_number);
    console.log('Taken seats:', takenSeats); // Debug log

    res.render('event', { event, takenSeats });
  } catch (err) {
    console.error("Error fetching event details:", err); // Log error
    return res.status(500).send("Error fetching event.");
  }
});

// Event creation form (GET route)
router.get('/events/create', async (req, res) => {
  try {
    // Fetch all categories (if needed)
    const categories = db.prepare('SELECT * FROM category').all();
    if (!categories || categories.length === 0) {
      return res.status(404).send("Categories not found.");
    }
    console.log('Fetched categories:', categories); // Debug log
    res.render('create-event', { categories });
  } catch (err) {
    console.error("Error fetching categories:", err); // Log error
    return res.status(500).send('Server Error');
  }
});

// Helper function to generate random 10-char code
function generateEntryCode(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Booking Route
router.post('/book', async (req, res) => {
  const { eventId, name, seat } = req.body;

  try {
    // Check if seat is already booked
    const existing = db.prepare("SELECT * FROM bookings WHERE event_id = ? AND seat_number = ?").get(eventId, seat);
    if (existing) {
      return res.send("Sorry, that seat is already booked.");
    }

    // Generate entry code
    const entryCode = generateEntryCode();

    // Insert booking
    db.prepare("INSERT INTO bookings (name, seat_number, entry_code, event_id) VALUES (?, ?, ?, ?)")
      .run(name, seat, entryCode, eventId);

    // Fetch event details
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(eventId);
    const events = db.prepare("SELECT * FROM events WHERE id != ?").all(eventId);

    // Render receipt page
    res.render('bookings', { name, seat, eventId, event, events, entryCode });
  } catch (err) {
    console.error("Error processing booking:", err);
    return res.status(500).send('Error processing booking.');
  }
});



// Configure Multer with custom filename
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads'); // <-- Use 'uploads' folder inside 'public'
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });
// const priceValue = parseFloat(price);
// const seatsValue = parseInt(total_seats, 10);

// Handle Event Creation
router.post('/events/create', upload.single('image'), async (req, res) => {
  const { name, date, price, total_seats, location, category_id, description } = req.body;
  const image = req.file ? req.file.filename : null;

  try {
    // Validate that all fields including image are present
    if (!name || !date || !price || !total_seats || !location || !category_id || !description || !image) {
      return res.status(400).send("All fields, including image, are required.");
    }

    // Insert into database
    db.prepare('INSERT INTO events (name, date, price, total_seats, location, category_id, description, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(name, date, price, total_seats, location, category_id, description, image);

    res.redirect('/'); // Redirect to homepage after successful creation
  } catch (err) {
    console.error("Error creating event:", err);
    return res.status(500).send("Server Error while creating event.");
  }
});


module.exports = router;
