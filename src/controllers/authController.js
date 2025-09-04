// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/Profile');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'devrefresh';

function signTokens(user) {
  const accessToken = jwt.sign(
    { sub: user._id, username: user.username, roles: user.roles },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign({ sub: user._id }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      res.status(400);
      throw new Error('username, email y password son requeridos');
    }

    const exists = await User.findOne({ $or: [{ username }, { email }] }).lean();
    if (exists) { res.status(409); throw new Error('Usuario o email ya existen'); }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, passwordHash, roles: ['user'] });

    const profile = await Profile.create({
      user: user._id,
      username,
      displayName: username,
      bio: '',
      theme: {},
      links: [],
    });

    user.profile = profile._id;
    await user.save();

    const { accessToken, refreshToken } = signTokens(user);
    await User.findByIdAndUpdate(user._id, { $addToSet: { refreshWhitelist: refreshToken } });

    res.status(201).json({
      user: { _id: user._id, username: user.username, email: user.email, profile: profile._id },
      profile,
      accessToken,
      refreshToken,
    });
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const { user, pass } = req.body || {}; // frontend envía { user, pass }
    if (!user || !pass) { res.status(400); throw new Error('user y pass requeridos'); }

    const found = await User.findOne({ $or: [{ username: user }, { email: user }] })
      .populate('profile', 'username displayName')
      .exec();
    if (!found) { res.status(401); throw new Error('Credenciales inválidas'); }

    const ok = await bcrypt.compare(pass, found.passwordHash);
    if (!ok) { res.status(401); throw new Error('Credenciales inválidas'); }

    const { accessToken, refreshToken } = signTokens(found);
    await User.findByIdAndUpdate(found._id, { $addToSet: { refreshWhitelist: refreshToken } });

    res.json({
      user: { _id: found._id, username: found.username, email: found.email, profile: found.profile?._id },
      profile: found.profile || null,
      accessToken,
      refreshToken,
    });
  } catch (err) { next(err); }
}

// (opcionales, por si ya los llamas desde rutas)
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) { res.status(400); throw new Error('refreshToken requerido'); }
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (!user) { res.status(401); throw new Error('Refresh inválido'); }
    if (!user.refreshWhitelist?.includes(refreshToken)) {
      res.status(401); throw new Error('Refresh revocado');
    }
    const tokens = signTokens(user);
    res.json(tokens);
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.json({ ok: true });
    const payload = jwt.decode(refreshToken);
    if (payload?.sub) {
      await User.findByIdAndUpdate(payload.sub, { $pull: { refreshWhitelist: refreshToken } });
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { register, login, refresh, logout };
