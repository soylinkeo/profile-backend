// routes/profileRoutes.js
const express = require('express');
const {
  createProfile,
  listProfiles,
  getById,
  getByUsername,
  updateProfile,
  upsertByUsername,
  removeProfile,
  getMe,
  upsertMe,
  getMyNfcLayout,        // 👈 añade
  upsertMyNfcLayout,     // 👈 añade
} = require('../controllers/profileController');
const requireAuth = require('../middlewares/requireAuth');

const router = express.Router();

// Públicas
router.get('/', listProfiles);
router.get('/by-username/:username', getByUsername);
router.get('/:id', getById);

// Propias (autenticadas)
router.get('/me/profile', requireAuth, getMe);
router.put('/me/profile', requireAuth, upsertMe);

// 👇 NUEVOS ENDPOINTS NFC LAYOUT
router.get('/me/nfc-layout', requireAuth, getMyNfcLayout);
router.put('/me/nfc-layout', requireAuth, upsertMyNfcLayout);

// Upsert por username
router.put('/by-username/:username', requireAuth, upsertByUsername);

// CRUD clásico
router.post('/', requireAuth, createProfile);
router.patch('/:id', requireAuth, updateProfile);
router.delete('/:id', requireAuth, removeProfile);

module.exports = router;
