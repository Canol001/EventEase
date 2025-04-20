const express = require('express');
const router = express.Router();
const db = require('../models/db');
const multer = require('multer');
const upload = multer({ dest: 'public/images' });

// Homepage - List Events
router.get('/', (req, res) => {
  db.all('SELECT * FROM events ORDER BY date ASC', (err, events) => {
    if (err) {
      return res.status(500).send('Database error.');
    }
    res.render('index', { events });
  });
});

// Event Detail + Booking Form
router.get('/event/:id', (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM events WHERE id = ?", [id], (err, event) => {
    if (err || !event) return res.send("Event not found.");

    db.all("SELECT seat_number FROM bookings WHERE event_id = ?", [id], (err, bookedSeats) => {
      const takenSeats = bookedSeats.map(row => row.seat_number);
      res.render('event', { event, takenSeats });
    });
  });
});

// Event creation form (GET route)
router.get('/events/create', (req, res) => {
  // Use db.all() to fetch all categories since we expect multiple rows
  db.all('SELECT * FROM category', (err, categories) => {
    if (err) {
      console.error('Error fetching categories:', err);
      return res.status(500).send('Server Error');
    }
    // Render the create-event page with the categories data
    res.render('create-event', { categories });
  });
});

// Handle Booking
router.post('/book', (req, res) => {
  const { eventId, name, seat } = req.body;

  // Check if seat is already booked
  db.get("SELECT * FROM bookings WHERE event_id = ? AND seat_number = ?", [eventId, seat], (err, existing) => {
    if (existing) {
      return res.send("Sorry, that seat is already booked.");
    }

    db.run("INSERT INTO bookings (name, seat_number, event_id) VALUES (?, ?, ?)",
      [name, seat, eventId], (err) => {
        if (err) throw err;
        res.render('bookings', { name, seat, eventId });
      });
  });
});

// Handle Event Creation (POST route)
router.post('/events/create', upload.single('image'), (req, res) => {
  const { name, date, price, location, category_id, description } = req.body;
  const image = req.file ? req.file.filename : null;

  db.run(
    `INSERT INTO events (name, date, price, location, category_id, image, description) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`, 
    [name, date, price, location, category_id, image, description],
    (err) => {
      if (err) {
        console.error('Error creating event:', err);
        return res.status(500).send('Error creating event.');
      }
      res.redirect('/events');
    }
  );
});

module.exports = router;