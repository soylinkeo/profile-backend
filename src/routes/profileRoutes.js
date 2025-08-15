const express = require('express');
const {
  createProfile,
  listProfiles,
  getById,
  getByUsername,
  updateProfile,
  upsertByUsername,
  removeProfile,
} = require('../controllers/profileController');

const router = express.Router();

// Collection
router.get('/', listProfiles);
router.post('/', createProfile);

// Helpers
router.get('/by-username/:username', getByUsername);
router.put('/by-username/:username', upsertByUsername);

// Single item
router.get('/:id', getById);
router.patch('/:id', updateProfile);
router.delete('/:id', removeProfile);

module.exports = router;
