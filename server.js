const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

require("dotenv").config();

const routes = require('./routes');

const app = express();

app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB!');
});

app.use(routes);

const PORT = process.env.PORT || 8080;

// Kreiramo HTTP server koristeći Express aplikaciju
const server = http.createServer(app);

// Slušamo na određenoj IP adresi i portu
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/`);
});
