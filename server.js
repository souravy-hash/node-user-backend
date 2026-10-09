const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

console.log("RUNNING FILE:", __filename);


// ======================================================
// PATHS
// ======================================================

const uploadFolder = path.join(__dirname, 'uploads');

// ✅ PERMANENT SAVE
const usersFile = path.join(__dirname, 'users.json');


// ======================================================
// CREATE UPLOADS FOLDER IF NOT EXISTS
// ======================================================

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, {
    recursive: true,
  });
}


// ======================================================
// ✅ PERMANENT SAVE
// CREATE users.json IF NOT EXISTS
// ======================================================

if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(
    usersFile,
    JSON.stringify([], null, 2)
  );
}


// ======================================================
// READ USERS
// ======================================================

function readUsers() {
  try {

    // File exist nahi karti
    if (!fs.existsSync(usersFile)) {

      // ✅ Automatically empty list create
      fs.writeFileSync(usersFile, '[]');

      return [];
    }


    // File read karo
    const data = fs.readFileSync(
      usersFile,
      'utf8'
    ).trim();


    // ✅ FIX:
    // Agar users.json completely blank hai
    if (data === '') {

      // Automatically [] save kar do
      fs.writeFileSync(usersFile, '[]');

      return [];
    }


    // Valid JSON hai to parse karo
    return JSON.parse(data);

  } catch (error) {

    console.log(
      'USERS FILE ERROR:',
      error.message
    );


    // ✅ Safety
    // Invalid/empty JSON hone par reset
    fs.writeFileSync(usersFile, '[]');


    return [];
  }
}


// ======================================================
// ✅ PERMANENT SAVE
// SAVE USERS INTO users.json
// ======================================================

function saveUsers(users) {

  fs.writeFileSync(
    usersFile,
    JSON.stringify(users, null, 2)
  );
}


// ======================================================
// MULTER SETUP
// ======================================================

const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    cb(null, uploadFolder);
  },


  filename: function (req, file, cb) {

    const fileName =
      Date.now() + '-' + file.originalname;

    cb(null, fileName);
  },
});


const upload = multer({
  storage: storage,
});


// ======================================================
// UPLOADS FOLDER PUBLIC
// ======================================================

app.use(
  '/uploads',
  express.static(uploadFolder)
);


// ======================================================
// ROOT API
// ======================================================

app.get('/', (req, res) => {

  res.send('Node.js server is working!');

});


// ======================================================
// GET USERS
// ======================================================

app.get('/users', (req, res) => {

  // ✅ PERMANENT SAVE
  // users.json se users uthao
  const users = readUsers();


  // ==========================================
  // Flutter pagination support
  //
  // _start = kitne users skip
  // _limit = kitne users chahiye
  // ==========================================

  const start =
    parseInt(req.query._start ?? '0');

  const limit =
    parseInt(
      req.query._limit ?? users.length.toString()
    );


  const paginatedUsers = users.slice(
    start,
    start + limit
  );


  // ==========================================
  // Current Cloudflare URL ke saath
  // image URL automatically banao
  // ==========================================

  const responseUsers = paginatedUsers.map(
    (user) => {

      return {
        ...user,

        image: user.image
            ? `${req.protocol}://${req.get('host')}${user.image}`
            : '',
      };
    }
  );


  res.json(responseUsers);
});


// ======================================================
// POST USER + IMAGE
// ======================================================

app.post(
  '/users',

  upload.single('image'),

  (req, res) => {

    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;

    const image = req.file;


    console.log('BODY:', req.body);
    console.log('IMAGE:', image);


    // ✅ PERMANENT SAVE
    // Existing users file se lao
    const users = readUsers();

// ✅ ID FIX
const newId =
  users.length === 0
      ? 1
      : Math.max(
          ...users.map(
            (user) => Number(user.id)
          )
        ) + 1;
    // ==========================================
    // NEW USER
    // ==========================================

    const newUser = {

      id: users.length + 1,

      firstName: firstName,

      lastName: lastName,

      email: email,


      // ✅ IMPORTANT
      //
      // Cloudflare ka complete URL save nahi karenge.
      //
      // Sirf:
      // /uploads/photo.jpg
      //
      // save karenge.
      //
      // Isliye Cloudflare URL change hone ke baad
      // image break nahi hogi.
      image: image
          ? `/uploads/${image.filename}`
          : '',
    };


    // New user list me add
    users.push(newUser);


    // ✅ PERMANENT SAVE
    saveUsers(users);


    console.log(
      'USER SAVED:',
      newUser
    );


    // ==========================================
    // Flutter ko complete image URL return
    // ==========================================

    const responseUser = {

      ...newUser,

      image: newUser.image
          ? `${req.protocol}://${req.get('host')}${newUser.image}`
          : '',
    };


    res.status(201).json(responseUser);
  }
);

// ======================================================
// DELETE USER
// ======================================================

app.delete('/users/:id', (req, res) => {

  // Flutter se URL me ID aayegi:
  // /users/1
  const id = Number(req.params.id);

  // users.json se users read karo
  const users = readUsers();

  // ID wala user find karo
  const userIndex = users.findIndex(
    (user) => Number(user.id) === id
  );

  // User nahi mila
  if (userIndex === -1) {
    return res.status(404).json({
      message: 'User not found',
    });
  }

  // User ko list se remove karo
  users.splice(userIndex, 1);

  // Updated list users.json me save karo
  saveUsers(users);

  console.log('USER DELETED:', id);

  // Flutter ko success response
  res.status(200).json({
    message: 'User deleted successfully',
    id: id,
  });
});

// ======================================================
// ERROR HANDLING
// ======================================================

app.use((error, req, res, next) => {

  console.log(
    'SERVER ERROR:',
    error
  );

  res.status(500).json({
    message: error.message,
  });
});


// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {

  console.log(
    `Server running on http://localhost:${PORT}`
  );

  console.log(
    'Upload folder:',
    uploadFolder
  );

  console.log(
    'Users file:',
    usersFile
  );
});