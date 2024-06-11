const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const routes = require('./routes');

const app = express();

const corsOptions = {
  origin: 'https://blue-coast-027388e03.5.azurestaticapps.net/',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 200,
  allowedHeaders: 'Content-Type,Authorization'
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const keyVaultName = process.env.KEY_VAULT_NAME; 
const KVUri = `https://${keyVaultName}.vault.azure.net`;

const credential = new DefaultAzureCredential();
const client = new SecretClient(KVUri, credential);

async function getSecret(secretName) {
    try {
        const secret = await client.getSecret(secretName);
        return secret.value;
    } catch (error) {
        console.error("Failed to retrieve secret:", error);
        throw error;
    }
}

async function startServer() {
    const mongoUriSecretName = process.env.MONGO_URI_SECRET_NAME; 
    const mongoUri = await getSecret(mongoUriSecretName);

    mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'Connection error:'));
    db.once('open', () => {
      console.log('Connected to Azure MongoDB!');
    });

    app.options('*', cors(corsOptions));

    app.use(routes);

    const PORT = process.env.PORT || 8080;

    const server = http.createServer(app);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${PORT}/`);
    });
}

startServer().catch(err => console.error(err));
