require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Initialize Express
const app = express();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/sessions' }),
  cookie: { maxAge: 86400000 } // 24 hours
}));

// Passport configuration
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: `${process.env.DASHBOARD_URL}/auth/discord/callback`,
  scope: ['identify', 'guilds'],
}, (accessToken, refreshToken, profile, done) => {
  process.nextTick(() => done(null, profile));
}));

app.use(passport.initialize());
app.use(passport.session());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make Supabase available to routes
app.locals.supabase = supabase;

// Routes
const authRoutes = require('./routes/auth');
const ownerRoutes = require('./routes/owner');
const adminRoutes = require('./routes/admin');

app.use('/auth', authRoutes);
app.use('/owner', ensureAuthenticated, ensureOwner, ownerRoutes);
app.use('/admin', ensureAuthenticated, ensureAdmin, adminRoutes);

// Home page
app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Dashboard running on http://localhost:${PORT}`);
});

// Middleware to check authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/discord');
}

// Middleware to check if user is owner
async function ensureOwner(req, res, next) {
  if (req.user.id === process.env.OWNER_ID) return next();
  res.status(403).render('error', {
    message: 'You do not have permission to access this page.',
    status: 403
  });
}

// Middleware to check if user is admin
async function ensureAdmin(req, res, next) {
  try {
    const { supabase } = req.app.locals;
    const { data: admin, error } = await supabase
      .from('guild_admins')
      .select('*')
      .eq('guild_id', req.user.guilds[0].id)
      .eq('user_id', req.user.id)
      .single();

    if (admin || req.user.id === process.env.OWNER_ID) return next();

    res.status(403).render('error', {
      message: 'You do not have admin permission for this server.',
      status: 403
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('500');
  }
}
