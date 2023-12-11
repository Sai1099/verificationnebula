const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');

const fs = require('fs');
const crypto = require('crypto');
// Assuming you have a middleware for authentication
// Assuming you have a middleware for handling file uploads

const app = express();
// middleware/isAuthenticated.js

const isAuthenticated = (req, res, next) => {
  // Your authentication logic here
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/login'); // Redirect to your login page or handle unauthenticated requests
};

app.get('/dashboard', isAuthenticated, (req, res) => {
  const user = req.user; // Assuming the user object is available in req.user after authentication

  res.render('dashboard', { user });
});
  
  
// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://sai:nebula123@cluster0.l9c5xyp.mongodb.net/test?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

// User schema and model
// Assuming your User model looks something like this
const userSchema = new mongoose.Schema({
  

    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      default: 'user', // Default role is set to 'user'; change as needed
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String, // Change the type accordingly based on your token generation method
    },
  });
  
  
  const User = mongoose.model('User', userSchema);
  // In your route/controller where you fetch the user
 
  

// Passport setup
app.use(session({ secret: '32577272fdc02f1a54465049bb03375bf860acaa4f1166226023b4ca23e9c21', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new GoogleStrategy({
    clientID: '772787922-4une922l7nn5vpdsucq5fj6r9l1m8j5j.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://localhost:3000/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // Save user profile in your database or perform other actions
    const user = {
      
      
      username: profile.displayName,
      emails: profile.emails,
      // Add any other relevant user information
    };

    return done(null, user);
  }
));

// Serialize and deserialize user functions
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Use Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Use the Google OAuth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/upload-letter');
});






// ...

// Express middleware
app.use(session({ secret: '032577272fdc02f1a54465049bb03375bf860acaa4f1166226023b4ca23e9c21', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Routes

  
  app.get('/success', (req, res) => {
    res.send('Upload successful!'); // You can replace this with the content you want to display on the success page
  });
  






const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

  // Updated code for email verification

     
      
     app.get('/upload-letter', (req, res) => {
        res.sendFile(path.join(__dirname, 'verify-letter.html'));
      });
      
// ...
app.post('/upload-letter', upload.single('letter'), isAuthenticated, async (req, res) => {
  try {
    // Check if the user is authenticated
    if (!req.isAuthenticated()) {
      return res.redirect('/');
    }

    // Fetch user information
    const user = req.user;
    const userEmail = user.emails && user.emails.length > 0 ? user.emails[0].value : 'Unknown';
    const userName = user.username || 'Unknown';

    // Implement your verification logic here
    const letterPath = req.file.path;

    // Implement logic to send verification email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'contact.nebulaapparel@gmail.com',
        pass: 'pgfksxpluzffqifj', // Replace with your Gmail password or an App Password
      },
    });

    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Save the verification token to the new user in the database
    const newUser = new User({
      username: userName,
      email: userEmail,
      isVerified: false, // Set to false by default, update to true after verification
      verificationToken: verificationToken, // Include the verification token
    });

    await newUser.save();

    // Update the verification link with the token and username
    const verificationLink = `http://localhost:3000/verify-email/${userEmail}/${verificationToken}`;

    const mailOptions = {
      from: 'contact.nebulaapparel@gmail.com',
      to: 'contact.nebulaapparel@gmail.com',
      subject: `New Letter Uploaded - ${userName}`,
      text: `A new letter has been uploaded by ${userName} (${userEmail}). Please verify it by clicking the following link: ${verificationLink}`,
      attachments: [
        {
          filename: req.file.originalname,
          path: letterPath,
        },
      ],
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Internal Server Error');
      } else {
        console.log('Email sent:', info.response);
        res.send('Letter uploaded successfully! Wait for verification.');
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// Verification endpoint
app.get('/verify-email/:email/:token', async (req, res) => {
  try {
    const email = req.params.email;
    const token = req.params.token;

    // Find the user by username
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Check if the token matches the user's verificationToken
    if (user.verificationToken === token) {
      // Update the user's isVerified status
      user.isVerified = true;
      user.verificationToken = undefined; // Clear the verification token
      await user.save();

      return res.send('Email verification successful! You can now access the secured content.');
    } else {
      return res.status(403).send('Invalid verification token');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});















// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});