const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/images'));
  },
  filename: function (req, file, cb) {
    // Create a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'quiz-image-' + uniqueSuffix + ext);
  }
});

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure upload
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Debug middleware to log request details
router.use((req, res, next) => {
  console.log('Upload Request Headers:', req.headers);
  console.log('Upload Request Body:', req.body);
  next();
});

// Upload image endpoint - added more debugging and error handling
router.post('/images', (req, res, next) => {
  console.log('Received upload request');
  
  // Use upload.single middleware directly in the route handler
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message });
    }
    
    console.log('File:', req.file);
    
    // Check if file was received
    if (!req.file) {
      console.error('No file received. Form field should be named "image"');
      return res.status(400).json({ 
        error: "No image uploaded",
        message: "Make sure the form field is named 'image' and you've selected a file"
      });
    }

    try {
      // Construct URL to the uploaded file
      const protocol = req.protocol;
      const host = req.get('host');
      
      // Create the URL that points to the image file
      const imageUrl = `${protocol}://${host}/uploads/images/${req.file.filename}`;
      
      res.status(201).json({ 
        message: 'Image uploaded successfully',
        imageUrl: imageUrl,
        filename: req.file.filename,
        size: req.file.size
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });
});

// Upload question image endpoint
router.post('/question-images', (req, res, next) => {
  console.log('Received question image upload request');
  
  // Use upload.single middleware
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message });
    }
    
    console.log('Question Image File:', req.file);
    
    // Check if file was received
    if (!req.file) {
      console.error('No file received. Form field should be named "image"');
      return res.status(400).json({ 
        error: "No image uploaded",
        message: "Make sure the form field is named 'image' and you've selected a file"
      });
    }

    try {
      // Construct URL to the uploaded file
      const protocol = req.protocol;
      const host = req.get('host');
      
      // Create the URL that points to the image file
      const imageUrl = `${protocol}://${host}/uploads/images/${req.file.filename}`;
      
      res.status(201).json({ 
        message: 'Question image uploaded successfully',
        imageUrl: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        type: 'question_image'
      });
    } catch (error) {
      console.error('Error uploading question image:', error);
      res.status(500).json({ error: 'Failed to upload question image' });
    }
  });
});

// Upload option image endpoint - for multiple choice with image options
router.post('/option-images', (req, res, next) => {
  console.log('Received option image upload request');
  
  // Use upload.array to handle multiple images
  upload.array('images', 10)(req, res, (err) => { // Allow up to 10 images for options
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message });
    }
    
    console.log('Option Image Files:', req.files);
    
    // Check if files were received
    if (!req.files || req.files.length === 0) {
      console.error('No files received. Form field should be named "images"');
      return res.status(400).json({ 
        error: "No images uploaded",
        message: "Make sure the form field is named 'images' and you've selected at least one file"
      });
    }

    try {
      // Construct URLs to the uploaded files
      const protocol = req.protocol;
      const host = req.get('host');
      
      // Create the URLs that point to the image files
      const imageUrls = req.files.map(file => {
        return {
          imageUrl: `${protocol}://${host}/uploads/images/${file.filename}`,
          filename: file.filename,
          size: file.size
        };
      });
      
      res.status(201).json({ 
        message: 'Option images uploaded successfully',
        images: imageUrls,
        count: imageUrls.length,
        type: 'option_images'
      });
    } catch (error) {
      console.error('Error uploading option images:', error);
      res.status(500).json({ error: 'Failed to upload option images' });
    }
  });
});

module.exports = router;
