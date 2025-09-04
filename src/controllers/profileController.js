// controllers/profileController.js
const Profile = require('../models/Profile');
const { createSchema, updateSchema } = require('../validation/profileValidation');
const { nfcLayoutSchema } = require('../validation/nfcLayoutValidation');

// GET /api/profiles/me  (propio)
async function getMe(req, res, next) {
  try {
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) { res.status(404); throw new Error('Profile no encontrado'); }
    res.json(profile);
  } catch (err) { next(err); }
}

// PUT /api/profiles/me  (propio, upsert opcional)
async function upsertMe(req, res, next) {
  try {
    const { value, error } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) { res.status(400); throw new Error(error.details.map(d=>d.message).join('; ')); }

    // impedir que manipulen user/username por body
    delete value.user;
    // si quieres permitir cambiar username aquí, extráelo explícito:
    let usernamePatch = {};
    if (typeof req.body.username === 'string' && req.body.username.trim()) {
      usernamePatch.username = req.body.username.trim();
    }

    const updated = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { $set: { ...value, ...usernamePatch } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(updated);
  } catch (err) { next(err); }
}

/** ====== Lo que ya tenías, con ownership check en updates por :id y upsertByUsername ====== */

async function createProfile(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body, { abortEarly: false });
    if (error) { res.status(400); throw new Error(error.details.map(d=>d.message).join('; ')); }

    // 👇 fuerza relación: el user del token es el dueño
    const existsForUser = await Profile.findOne({ user: req.user._id });
    if (existsForUser) { res.status(409); throw new Error('Este usuario ya tiene profile'); }

    const existsUsername = await Profile.findOne({ username: value.username });
    if (existsUsername) { res.status(409); throw new Error('Username de profile ya existe'); }

    const profile = await Profile.create({ ...value, user: req.user._id });
    res.status(201).json(profile);
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const { value, error } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) { res.status(400); throw new Error(error.details.map(d=>d.message).join('; ')); }

    // sólo dueño:
    const profile = await Profile.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: value },
      { new: true, runValidators: true }
    );
    if (!profile) { res.status(404); throw new Error('Profile no encontrado'); }
    res.json(profile);
  } catch (err) { next(err); }
}

async function upsertByUsername(req, res, next) {
  try {
    const username = req.params.username;
    const { value, error } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) { res.status(400); throw new Error(error.details.map(d=>d.message).join('; ')); }

    // sólo permitir si el profile con ese username pertenece al usuario autenticado
    const existing = await Profile.findOne({ username });
    if (existing && String(existing.user) !== String(req.user._id)) {
      res.status(403); throw new Error('No puedes editar el profile de otro usuario');
    }

    const updated = await Profile.findOneAndUpdate(
      existing ? { _id: existing._id } : { username }, // crea o actualiza
      { $set: { ...value, user: req.user._id, username } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json(updated);
  } catch (err) { next(err); }
}

// Resto sin cambios (list, getById, getByUsername, remove con ownership en remove)
async function listProfiles(req, res, next) {
  try { const items = await Profile.find().sort({ createdAt: -1 }).limit(50); res.json(items); }
  catch (err) { next(err); }
}
async function getById(req, res, next) {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) { res.status(404); throw new Error('Profile not found'); }
    res.json(profile);
  } catch (err) { next(err); }
}
async function getByUsername(req, res, next) {
  try {
    const profile = await Profile.findOne({ username: req.params.username });
    if (!profile) { res.status(404); throw new Error('Profile not found'); }
    res.json(profile);
  } catch (err) { next(err); }
}
async function removeProfile(req, res, next) {
  try {
    const out = await Profile.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!out) { res.status(404); throw new Error('Profile no encontrado'); }
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// GET /api/profiles/me/nfc-layout
async function getMyNfcLayout(req, res, next) {
  try {
    // con .lean() -> profile.meta es un objeto plano
    const profile = await Profile.findOne({ user: req.user._id }).lean();
    if (!profile) { res.status(404); throw new Error('Profile no encontrado'); }

    const data = profile.meta?.nfcDesignerDualV1 ?? null;  // 👈 acceso por punto
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

// PUT /api/profiles/me/nfc-layout
async function upsertMyNfcLayout(req, res, next) {
  try {
    const { value, error } = nfcLayoutSchema.validate(req.body, { abortEarly: false });
    if (error) { res.status(400); throw new Error(error.details.map(d => d.message).join('; ')); }

    // si quieres evitar crear un profile vacío por error, NO uses upsert aquí:
    const updated = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { $set: { 'meta.nfcDesignerDualV1': value } },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) { res.status(404); throw new Error('Profile no encontrado'); }

    res.json({ ok: true, data: updated.meta?.nfcDesignerDualV1 ?? value });
  } catch (err) { next(err); }
}


module.exports = {
  // nuevos
  getMe, upsertMe,

   getMyNfcLayout, upsertMyNfcLayout,      

  // existentes (algunos ajustados)
  createProfile, listProfiles, getById, getByUsername, updateProfile, upsertByUsername, removeProfile,
};
