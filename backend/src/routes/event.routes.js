import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { createEvent, listEvents, getEvent, deleteEvent } from '../controllers/event.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'arenahub_events',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const upload = multer({ storage: storage });
const router = Router();

router.post('/', protect, authorize('AUTHORITY'), upload.single('poster'), createEvent);
router.get('/', protect, listEvents);
router.get('/:id', protect, getEvent);
router.delete('/:id', protect, authorize('AUTHORITY'), deleteEvent);

export default router;
