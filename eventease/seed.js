// seed.js
const db = require('./models/db');

const events = [
  {
    name: 'Tech Innovators Conference 2025',
    description: 'A conference showcasing cutting-edge innovations in tech.',
    location: 'Nairobi International Convention Centre',
    date: '2025-06-10',
    time: '09:00',
    total_seats: 100,
    price: 500,
    image: 'tech2025.jpg'
  },
  {
    name: 'Afro Music Fest',
    description: 'A night of Afrobeat, food, and cultural vibes.',
    location: 'Uhuru Gardens, Nairobi',
    date: '2025-07-15',
    time: '18:00',
    total_seats: 150,
    price: 1200,
    image: 'afrofest.jpg'
  },
  {
    name: 'Startup Pitch Night',
    description: 'Watch startups battle it out for funding in front of top investors.',
    location: 'iHub, Nairobi',
    date: '2025-08-01',
    time: '17:00',
    total_seats: 80,
    price: 300,
    image: 'pitchnight.jpg'
  }
];

db.serialize(() => {
  // Clear existing data (optional)
  db.run('DELETE FROM events');

  const stmt = db.prepare(`
    INSERT INTO events (name, description, location, date, time, total_seats, price, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  events.forEach(event => {
    stmt.run(
      event.name,
      event.description,
      event.location,
      event.date,
      event.time,
      event.total_seats,
      event.price,
      event.image
    );
  });

  stmt.finalize(() => {
    console.log('Sample events inserted.');
    db.close();
  });
});
