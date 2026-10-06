import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function googleLogin(req, res) {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ success: false, message: 'Missing Google credential token' });
  }

  // 1. Cryptographically verify Google ID Token signature and claims via official Google OAuth client
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or forged Google token' });
  }

  const { email, name, sub: googleId } = payload;

  // 2. Domain check — the single identity guarantee for the platform
  const domain = process.env.ALLOWED_EMAIL_DOMAIN;
  if (!email.toLowerCase().endsWith(domain)) {
    return res.status(403).json({
      success: false,
      message: `Only ${domain} emails are allowed`,
    });
  }

  // 3. Find or create user (single query using OR condition to avoid sequential DB roundtrips)
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { googleId },
        { email: email.toLowerCase() }
      ]
    }
  });

  if (!user) {
    // New user — auto-generate a permanent username
    // Extract base username from their real Google display name (e.g., "Rahul Kumar" -> "rahul")
    // We take the first word, lowercase it, and strip any non-alphabet characters
    let baseUsername = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    
    // Fallback just in case the name didn't have any standard alphabet characters
    if (!baseUsername) baseUsername = 'user';
    
    // Truncate to max 10 characters to keep it clean, then append 4 unique digits
    baseUsername = baseUsername.slice(0, 10);
    const generatedUsername = `${baseUsername}_${googleId.slice(0, 4)}`;

    user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        googleId,
        username: generatedUsername,
        usernameLower: generatedUsername.toLowerCase(),
        role: 'STUDENT', // Authority accounts are seeded, never self-registered
      },
    });
  } else if (!user.googleId) {
    // If user existed by email but googleId wasn't linked yet, update it
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId },
    });
  }

  // 4. Issue full JWT immediately (bypassing the "choose username" step)
  const token = jwt.sign(
    { userId: user.id, role: user.role, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );

  res.json({
    success: true,
    needsUsername: false,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
    },
  });
}

// Username validation rules
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,20}$/;

export async function completeRegistration(req, res) {
  const { username } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing temp token' });
  }

  // Verify temp token
  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.purpose !== 'complete-registration') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }
  } catch {
    return res.status(401).json({ success: false, message: 'Temp token expired or invalid' });
  }

  // Validate username format
  if (!username || !USERNAME_REGEX.test(username)) {
    return res.status(400).json({
      success: false,
      message: 'Username must be 3-20 characters, alphanumeric with . or _ only',
    });
  }

  // Set username — the UNIQUE constraint on usernameLower is the real
  // uniqueness guarantee. Application-level checks alone have a race
  // condition; the DB constraint catches it atomically.
  try {
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        username,
        usernameLower: username.toLowerCase(),
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    // Prisma unique constraint violation
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }
    throw err;
  }
}

export async function getMe(req, res) {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      username: req.user.username,
      role: req.user.role,
    },
  });
}

export async function resolveUsername(req, res) {
  const user = await prisma.user.findUnique({
    where: { usernameLower: req.params.username.toLowerCase() },
    select: { username: true, name: true, id: true },
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({ success: true, user });
}

export async function localLogin(req, res) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || !user.password) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
    },
  });
}

