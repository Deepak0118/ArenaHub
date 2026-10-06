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

  const { email, name, sub: googleId, email_verified, aud } = payload;

  // 2. Validate essential payload fields
  if (!email || !googleId) {
    return res.status(400).json({ success: false, message: 'Google account missing required identity claims' });
  }

  if (email_verified !== true) {
    return res.status(403).json({ success: false, message: 'Unverified Google email address' });
  }

  if (process.env.GOOGLE_CLIENT_ID && aud !== process.env.GOOGLE_CLIENT_ID) {
    return res.status(403).json({ success: false, message: 'Invalid token audience' });
  }

  // 3. Exact and safe institutional domain validation using @${domain}
  const rawDomain = process.env.ALLOWED_EMAIL_DOMAIN || 'chitkara.edu.in';
  const domain = rawDomain.replace(/^@/, '').toLowerCase();
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail.endsWith(`@${domain}`)) {
    return res.status(403).json({
      success: false,
      message: `Only official @${domain} email addresses are permitted.`,
    });
  }

  // 4. Single optimized DB lookup by googleId OR email
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { googleId },
        { email: normalizedEmail }
      ]
    }
  });

  if (!user) {
    // 5. Collision-resistant username generation with race-condition safety
    let baseUsername = (name || 'user').split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!baseUsername) baseUsername = 'user';
    baseUsername = baseUsername.slice(0, 10);

    const suffix = `${googleId.slice(-6)}_${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedUsername = `${baseUsername}_${suffix}`;

    try {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name || 'Student',
          googleId,
          username: generatedUsername,
          usernameLower: generatedUsername.toLowerCase(),
          role: 'STUDENT',
        },
      });
    } catch (err) {
      // Handle concurrent creation race condition (Prisma P2002)
      if (err.code === 'P2002') {
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { googleId },
              { email: normalizedEmail }
            ]
          }
        });

        if (!user) {
          const fallbackUsername = `user_${Date.now()}`;
          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              name: name || 'Student',
              googleId,
              username: fallbackUsername,
              usernameLower: fallbackUsername.toLowerCase(),
              role: 'STUDENT',
            }
          });
        }
      } else {
        throw err;
      }
    }
  } else if (!user.googleId) {
    // If user existed by email but googleId was null, link it safely
    try {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    } catch (err) {
      if (err.code !== 'P2002') throw err;
      user = await prisma.user.findUnique({ where: { id: user.id } });
    }
  }

  // 6. Issue ArenaHub JWT containing only necessary safe claims
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

