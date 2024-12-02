'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const express = require('express');
const passport = require('passport');
const { Strategy } = require('passport-openidconnect');
const session = require('express-session');
const corsOptions = require('./config/cors');
const cors = require('cors');
const compression = require('compression');
const api = require('./routes/api');
const room = require('./routes/room');
const sms = require('./routes/sms');
const token = require('./routes/token');
const users = require('./routes/users');
const config = require('./config');
const ngrok = require('./common/ngrok');
const sentry = require('./common/sentry');
const logs = require('./common/logs');
const path = require('path');
const packageJson = require('../package.json');

const log = new logs('Server');

const apiPath = '/api/v1';

sentry.start(); // Start sentry (optional)

// Load configuration from .env
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = process.env.SERVER_PORT;
const SERVER_URL = process.env.SERVER_URL;
const MONGO_URL = process.env.MONGO_URL;
const MONGO_DATABASE = process.env.MONGO_DATABASE;
const SESSION_SECRET = process.env.SESSION_SECRET;

// Keycloak OIDC variables
const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER;
const KEYCLOAK_AUTHORIZATION_URL = process.env.KEYCLOAK_AUTHORIZATION_URL;
const KEYCLOAK_TOKEN_URL = process.env.KEYCLOAK_TOKEN_URL;
const KEYCLOAK_USERINFO_URL = process.env.KEYCLOAK_USERINFO_URL;
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;
const KEYCLOAK_CALLBACK_URL = process.env.KEYCLOAK_CALLBACK_URL;

// Check mandatory params
if (
  !SERVER_HOST || !SERVER_PORT || !SERVER_URL || 
  !MONGO_URL || !MONGO_DATABASE || 
  !SESSION_SECRET || !KEYCLOAK_ISSUER ||
  !KEYCLOAK_AUTHORIZATION_URL || !KEYCLOAK_TOKEN_URL ||
  !KEYCLOAK_USERINFO_URL || !KEYCLOAK_CLIENT_ID ||
  !KEYCLOAK_CLIENT_SECRET || !KEYCLOAK_CALLBACK_URL
) {
  log.error('Invalid or missing .env file');
  process.exit(1);
}

const home = SERVER_URL;
const apiDocs = home + apiPath + '/docs';

const frontendDir = path.join(__dirname, '../', 'frontend');
const login = path.join(__dirname, '../', 'frontend/html/home.html');
const client = path.join(__dirname, '../', 'frontend/html/client.html');

mongoose.set('strictQuery', true);

mongoose
  .connect(MONGO_URL, { dbName: MONGO_DATABASE })
  .then(() => {
    const app = express();

    // Middleware setup
    app.use(cors(corsOptions()));
    app.use(compression());
    app.use(express.static(frontendDir));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // Express-Session
    app.use(
      session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
      })
    );

    // Passport OIDC setup
    passport.use(
      new Strategy(
        {
          issuer: KEYCLOAK_ISSUER,
          authorizationURL: KEYCLOAK_AUTHORIZATION_URL,
          tokenURL: KEYCLOAK_TOKEN_URL,
          userInfoURL: KEYCLOAK_USERINFO_URL,
          clientID: KEYCLOAK_CLIENT_ID,
          clientSecret: KEYCLOAK_CLIENT_SECRET,
          callbackURL: KEYCLOAK_CALLBACK_URL,
          scope: 'openid profile email',
        },
        (issuer, sub, profile, accessToken, refreshToken, done) => {
          return done(null, profile);
        }
      )
    );

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    app.use(passport.initialize());
    app.use(passport.session());

    // Logs requests
    app.use((req, res, next) => {
      log.debug('New request:', {
        headers: req.headers,
        body: req.body,
        method: req.method,
        path: req.originalUrl,
      });
      next();
    });

    // Routes
    app.use(apiPath, api);
    app.use(apiPath, room);
    app.use(apiPath, sms);
    app.use(apiPath, token);
    app.use(apiPath, users);

    app.get('/', (req, res) => {
      res.sendFile(login);
    });

    app.get('/client', passport.authenticate('oidc', { failureRedirect: '/' }), (req, res) => {
      res.sendFile(client);
    });

    app.get('/config', passport.authenticate('oidc', { failureRedirect: '/' }), (req, res) => {
      log.debug('Send config', config);
      res.status(200).json(config);
    });

    app.get('/logout', (req, res) => {
      req.logout(() => {
        res.redirect(`${KEYCLOAK_ISSUER}/protocol/openid-connect/logout`);
      });
    });

    app.use('*', (req, res) => {
      res.status(404).json({ message: 'Page not found' });
    });

    // Start server
    app.listen(SERVER_PORT, null, () => {
      if (ngrok.enabled()) {
        ngrok.start();
      } else {
        log.info('Server', {
          cors: corsOptions(),
          home: home,
          apiDocs: apiDocs,
          nodeVersion: process.versions.node,
          app_version: packageJson.version,
        });
      }
    });
  })
  .catch((err) => log.error('Mongoose init connection error: ' + err));

mongoose.connection.on('connected', () => {
  log.debug('Mongoose connection open to:', { url: MONGO_URL, db: MONGO_DATABASE });
});

mongoose.connection.on('error', (err) => {
  log.error('Mongoose connection error:', { error: err, url: MONGO_URL, db: MONGO_DATABASE });
});

mongoose.connection.on('disconnected', () => {
  log.debug('Mongoose connection disconnected');
});

process.on('SIGINT', () => {
  mongoose.connection
    .close()
    .then(() => {
      log.debug('Mongoose connection disconnected through app termination');
      process.exit(0);
    })
    .catch((error) => {
      log.error('Error closing MongoDB connection:', error);
      process.exit(0);
    });
});
