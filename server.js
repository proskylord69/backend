const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');
const mongoose = require('mongoose');
 dotenv = require('dotenv').config();

const app = express();
const PORT = 5000;

  app.use(cors());





const s3 = new AWS.S3({
  region: process.env.S3_UPLOAD_REGION,
  credentials: {
    accessKeyId: process.env.S3_UPLOAD_KEY,
    secretAccessKey: process.env.S3_UPLOAD_SECRET
  }
});

// Multer middleware for file upload
const upload = multer();

// console.log('MongoDB URI:', process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.once('open', () => {
  console.log('Connected to MongoDB database');
});

// Book schema
const bookSchema = new mongoose.Schema({
  bookName: String,
  authorName: String,
  description: String,
  thumbnailUrl: String,
  bookUrl: String
});
const Book = mongoose.model('Book', bookSchema);

// Define the file filter to accept only image and PDF files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed!'), false);
  }
};

// Route for file upload
app.post('/upload', upload.fields([{ name: 'file1' }, { name: 'file2' }]), async (req, res) => {
  try {
    const { bookName, authorName, description } = req.body;
    const file1 = req.files['file1'][0]; // Assuming the thumbnail is uploaded first
    const file2 = req.files['file2'][0]; // Assuming the book file is uploaded second

    // Validate files and book details
    if (!file1 || !file2 || !bookName || !authorName || !description) {
      return res.status(400).json({ message: 'Please provide all required fields and files!' });
    }

    // Upload files individually
    const uploadFile = async (file, folder) => {
      const params = {
        Bucket: 'harshaljadhav-file-upload-storage',
        Key: `${folder}/${file.originalname}`,
        Body: file.buffer
      };
      const uploadedFile = await s3.upload(params).promise();
      return uploadedFile.Location;
    };

    const thumbnailUrl = await uploadFile(file1, 'thumbnails');
    const bookUrl = await uploadFile(file2, 'books');

    // Save book details to MongoDB
    const newBook = new Book({
      bookName,
      authorName,
      description,
      thumbnailUrl,
      bookUrl
    });
    await newBook.save();

    res.status(200).json({
      thumbnailUrl,
      bookUrl,
      bookName,
      authorName,
      description,
      message: 'Files uploaded and book details saved successfully!'
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).send('Error uploading files. Please try again.');
  }
});

// Example Express API endpoint for fetching books
app.get('/books', async (req, res) => {
  try {
    const books = await Book.find(); // Retrieve all books from MongoDB
    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).send('Error fetching books. Please try again.');
  }
});

// Route for deleting a book by ID
app.delete('/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Find the book by ID and delete it from the database
    const deletedBook = await Book.findByIdAndDelete(id);
    if (!deletedBook) {
      // If the book with the specified ID is not found, return a 404 Not Found error
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).send('Error deleting book. Please try again.');
  }
});




app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
