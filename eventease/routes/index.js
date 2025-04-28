const express = require('express');
const router = express.Router();
const db = require('../models/db'); // Ensure this path is correct
const multer = require('multer');
const upload = multer({ dest: 'public/images' });

// Homepage - List Events
router.get('/', async (req, res) => {
  try {
    // Fetch events ordered by date
    const events = db.prepare('SELECT * FROM events ORDER BY date ASC').all();
    res.render('index', { events });
  } catch (err) {
    console.error("Error fetching events:", err);
    return res.status(500).send('Database error.');
  }
});

// Event Detail + Booking Form
router.get('/event/:id', async (req, res) => {
  const id = req.params.id;
  try {
    // Fetch the specific event by ID
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
    if (!event) return res.send("Event not found.");

    // Fetch booked seats for the event
    const bookedSeats = db.prepare("SELECT seat_number FROM bookings WHERE event_id = ?").all(id);
    const takenSeats = bookedSeats.map(row => row.seat_number);
    
    res.render('event', { event, takenSeats });
  } catch (err) {
    console.error("Error fetching event details:", err);
    return res.status(500).send("Error fetching event.");
  }
});

// Event creation form (GET route)
router.get('/events/create', async (req, res) => {
  try {
    // Fetch all categories (if needed)
    const categories = db.prepare('SELECT * FROM category').all();
    res.render('create-event', { categories });
  } catch (err) {
    console.error("Error fetching categories:", err);
    return res.status(500).send('Server Error');
  }
});

// Handle Booking (POST route)
router.post('/book', async (req, res) => {
  const { eventId, name, seat } = req.body;
  
  try {
    // Check if the seat is already booked
    const existing = db.prepare("SELECT * FROM bookings WHERE event_id = ? AND seat_number = ?").get(eventId, seat);
    if (existing) {
      return res.send("Sorry, that seat is already booked.");
    }

    // Insert the booking into the database
    db.prepare("INSERT INTO bookings (name, seat_number, event_id) VALUES (?, ?, ?)").run(name, seat, eventId);
    
    // Render the booking confirmation page
    res.render('bookings', { name, seat, eventId });
  } catch (err) {
    console.error("Error processing booking:", err);
    return res.status(500).send('Error processing booking.');
  }
});

// Handle Event Creation (POST route)
router.post('/events/create', upload.single('image'), async (req, res) => {
  const { name, date, price, location, category_id, description } = req.body;
  const image = req.file ? req.file.filename : null;

  try {
    // Insert the event into the database
    db.prepare(
      `INSERT INTO events (name, date, price, location, category_id, image, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(name, date, price, location, category_id, image, description);

    res.redirect('/events');
  } catch (err) {
    console.error("Error creating event:", err);
    return res.status(500).send('Error creating event.');
  }
});

module.exports = router;
