const Profile = require('../models/Profile');
const { createSchema, updateSchema } = require('../validation/profileValidation');

async function createProfile(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400);
      throw new Error(error.details.map(d => d.message).join('; '));
    }
    const exists = await Profile.findOne({ username: value.username });
    if (exists) {
      res.status(409);
      throw new Error('Username already exists');
    }
    const profile = await Profile.create(value);
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
}

async function listProfiles(req, res, next) {
  try {
    const items = await Profile.find().sort({ createdAt: -1 }).limit(50);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) {
      res.status(404);
      throw new Error('Profile not found');
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

async function getByUsername(req, res, next) {
  try {
    const profile = await Profile.findOne({ username: req.params.username });
    if (!profile) {
      res.status(404);
      throw new Error('Profile not found');
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { value, error } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400);
      throw new Error(error.details.map(d => d.message).join('; '));
    }
    const profile = await Profile.findByIdAndUpdate(
      req.params.id,
      { $set: value },
      { new: true, runValidators: true }
    );
    if (!profile) {
      res.status(404);
      throw new Error('Profile not found');
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

async function upsertByUsername(req, res, next) {
  try {
    const username = req.params.username;

    const body = { ...req.body };
    delete body.username;
    
    const { value, error } = updateSchema.validate(body, { abortEarly: false });
    if (error) {
      res.status(400);
      throw new Error(error.details.map(d => d.message).join('; '));
    }

    const updated = await Profile.findOneAndUpdate(
      { username },
      { $set: { ...value, username } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function removeProfile(req, res, next) {
  try {
    const out = await Profile.findByIdAndDelete(req.params.id);
    if (!out) {
      res.status(404);
      throw new Error('Profile not found');
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProfile,
  listProfiles,
  getById,
  getByUsername,
  updateProfile,
  upsertByUsername,
  removeProfile,
};
