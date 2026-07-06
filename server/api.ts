import { IncomingMessage, ServerResponse } from 'http';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Read MONGODB_URI and JWT_SECRET from environment or load .env manually
let MONGODB_URI = process.env.MONGODB_URI;
let JWT_SECRET = process.env.JWT_SECRET;

try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key === 'MONGODB_URI' && !MONGODB_URI) {
          MONGODB_URI = val;
        }
        if (key === 'JWT_SECRET' && !JWT_SECRET) {
          JWT_SECRET = val;
        }
      }
    });
  }
} catch (e) {
  console.error('[API] Failed to parse .env file manually:', e);
}

if (!JWT_SECRET) {
  JWT_SECRET = 'sola-ai-super-secret-key';
}

class FileDatabase {
  private filePath = path.join(process.cwd(), 'db.json');

  private read(): any {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ users: [], profiles: [], preferences: [], bookings: [], feedback: [] }, null, 2));
    }
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
    } catch {
      return { users: [], profiles: [], preferences: [], bookings: [], feedback: [] };
    }
  }

  private write(data: any) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  public find(collectionName: string, query: any = {}): any[] {
    const db = this.read();
    const list = db[collectionName] || [];
    return list.filter((item: any) => {
      for (const [key, value] of Object.entries(query)) {
        if (item[key] !== value) return false;
      }
      return true;
    });
  }

  public findOne(collectionName: string, query: any = {}): any {
    const results = this.find(collectionName, query);
    return results.length > 0 ? results[0] : null;
  }

  public insertOne(collectionName: string, doc: any): any {
    const db = this.read();
    if (!db[collectionName]) db[collectionName] = [];
    doc._id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    doc.createdAt = new Date().toISOString();
    db[collectionName].push(doc);
    this.write(db);
    return doc;
  }

  public updateOne(collectionName: string, query: any, update: any): boolean {
    const db = this.read();
    const list = db[collectionName] || [];
    const index = list.findIndex((item: any) => {
      for (const [key, value] of Object.entries(query)) {
        if (item[key] !== value) return false;
      }
      return true;
    });
    if (index === -1) return false;
    list[index] = { ...list[index], ...update, updatedAt: new Date().toISOString() };
    db[collectionName] = list;
    this.write(db);
    return true;
  }

  public deleteOne(collectionName: string, query: any): boolean {
    const db = this.read();
    const list = db[collectionName] || [];
    const index = list.findIndex((item: any) => {
      for (const [key, value] of Object.entries(query)) {
        if (item[key] !== value) return false;
      }
      return true;
    });
    if (index === -1) return false;
    list.splice(index, 1);
    db[collectionName] = list;
    this.write(db);
    return true;
  }
}

function sanitizeMongoUri(uri: string): string {
  try {
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      return uri;
    }
    const lastAtIndex = uri.lastIndexOf('@');
    if (lastAtIndex === -1) return uri;

    const protocolIndex = uri.indexOf('://');
    const protocol = uri.substring(0, protocolIndex + 3);
    const credentialsPart = uri.substring(protocolIndex + 3, lastAtIndex);
    const hostPart = uri.substring(lastAtIndex);

    const colonIndex = credentialsPart.indexOf(':');
    if (colonIndex === -1) {
      return protocol + encodeURIComponent(credentialsPart) + hostPart;
    }

    const username = credentialsPart.substring(0, colonIndex);
    const password = credentialsPart.substring(colonIndex + 1);

    return protocol + encodeURIComponent(username) + ':' + encodeURIComponent(password) + hostPart;
  } catch (e) {
    return uri;
  }
}

let mongoClient: MongoClient | null = null;
let useMongo = false;

if (MONGODB_URI) {
  try {
    const sanitized = sanitizeMongoUri(MONGODB_URI);
    mongoClient = new MongoClient(sanitized);
    useMongo = true;
    console.log('[API] MongoDB configured, will connect dynamically.');
  } catch (e) {
    console.error('[API] Failed to initialize MongoDB client:', e);
  }
} else {
  console.log('[API] MONGODB_URI not configured. Using local db.json database.');
}

const fileDb = new FileDatabase();

async function getDbCollection(collectionName: string) {
  if (useMongo && mongoClient) {
    await mongoClient.connect();
    const db = mongoClient.db('sola_db');
    return {
      find: async (query: any) => {
        const cursor = db.collection(collectionName).find(query);
        const res = await cursor.toArray();
        return res.map(d => ({ ...d, _id: d._id.toString() }));
      },
      findOne: async (query: any) => {
        if (query._id && typeof query._id === 'string' && query._id.length === 24) {
          try { query = { ...query, _id: new ObjectId(query._id) }; } catch (e) {}
        }
        const res = await db.collection(collectionName).findOne(query);
        if (!res) return null;
        return { ...res, _id: res._id.toString() };
      },
      insertOne: async (doc: any) => {
        doc.createdAt = new Date().toISOString();
        const res = await db.collection(collectionName).insertOne(doc);
        return { ...doc, _id: res.insertedId.toString() };
      },
      updateOne: async (query: any, update: any) => {
        if (query._id && typeof query._id === 'string' && query._id.length === 24) {
          try { query = { ...query, _id: new ObjectId(query._id) }; } catch (e) {}
        }
        const res = await db.collection(collectionName).updateOne(query, { $set: update });
        return res.modifiedCount > 0;
      },
      deleteOne: async (query: any) => {
        if (query._id && typeof query._id === 'string' && query._id.length === 24) {
          try { query = { ...query, _id: new ObjectId(query._id) }; } catch (e) {}
        }
        const res = await db.collection(collectionName).deleteOne(query);
        return res.deletedCount > 0;
      }
    };
  } else {
    return {
      find: async (query: any) => fileDb.find(collectionName, query),
      findOne: async (query: any) => fileDb.findOne(collectionName, query),
      insertOne: async (doc: any) => fileDb.insertOne(collectionName, doc),
      updateOne: async (query: any, update: any) => fileDb.updateOne(collectionName, query, update),
      deleteOne: async (query: any) => fileDb.deleteOne(collectionName, query)
    };
  }
}

function verifyToken(req: any): any {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export async function apiMiddleware(req: any, res: any, next: any) {
  const url = req.url || '';
  
  // Only intercept requests starting with /api (excluding /api-resend)
  if (!url.startsWith('/api') || url.startsWith('/api-resend')) {
    return next();
  }

  const method = req.method;
  const body = await parseJsonBody(req);
  
  try {
    // Route: /api/auth/signup
    if (url === '/api/auth/signup' && method === 'POST') {
      const { email, password, name } = body;
      if (!email || !password || !name) {
        return sendJson(res, 400, { error: 'Name, email, and password are required' });
      }
      const users = await getDbCollection('users');
      const existing = await users.findOne({ email });
      if (existing) {
        return sendJson(res, 400, { error: 'User already exists with this email' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await users.insertOne({ email, name, password: hashedPassword });
      
      // Create default profile for the user
      const profiles = await getDbCollection('profiles');
      await profiles.insertOne({
        userId: newUser._id,
        name: name,
        relation: 'Me',
        preferredLanguage: 'English',
        metadata: {}
      });
      
      const token = jwt.sign({ userId: newUser._id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
      return sendJson(res, 201, { token, user: { id: newUser._id, name, email } });
    }

    // Route: /api/auth/login
    if (url === '/api/auth/login' && method === 'POST') {
      const { email, password } = body;
      if (!email || !password) {
        return sendJson(res, 400, { error: 'Email and password are required' });
      }
      const users = await getDbCollection('users');
      
      // Auto-ensure Google User exists with correct password hash (supports MongoDB & corrects legacy file DB hash)
      if (email === 'google_user@gmail.com') {
        const googleUser = await users.findOne({ email });
        const correctPasswordHash = '$2b$10$otWLE7r5Tprhng3SWhlp1OXa81S.GZT5l025vxM8SIpPq6BEE8Ig.';
        if (!googleUser) {
          const newUser = await users.insertOne({
            email: 'google_user@gmail.com',
            name: 'Google User',
            password: correctPasswordHash
          });
          const profiles = await getDbCollection('profiles');
          await profiles.insertOne({
            userId: newUser._id,
            name: 'Google User',
            relation: 'Me',
            preferredLanguage: 'English',
            metadata: {}
          });
        } else {
          const isCorrectHash = await bcrypt.compare('google_sola_assistant_mock_password', googleUser.password);
          if (!isCorrectHash) {
            await users.updateOne({ _id: googleUser._id }, { password: correctPasswordHash });
          }
        }
      }

      const user = await users.findOne({ email });
      if (!user) {
        return sendJson(res, 400, { error: 'Invalid email or password' });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return sendJson(res, 400, { error: 'Invalid email or password' });
      }
      const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return sendJson(res, 200, { token, user: { id: user._id, name: user.name, email: user.email } });
    }

    // Authenticated Routes Check
    const decoded = verifyToken(req);
    if (!decoded) {
      return sendJson(res, 401, { error: 'Unauthorized. Invalid or missing token.' });
    }
    const userId = decoded.userId;

    // Route: /api/auth/me
    if (url === '/api/auth/me' && method === 'GET') {
      const users = await getDbCollection('users');
      const user = await users.findOne({ _id: userId });
      if (!user) {
        return sendJson(res, 404, { error: 'User not found' });
      }
      return sendJson(res, 200, { id: user._id, name: user.name, email: user.email });
    }

    // Route: /api/profiles
    if (url.startsWith('/api/profiles')) {
      const profiles = await getDbCollection('profiles');
      
      if (method === 'GET') {
        const list = await profiles.find({ userId });
        return sendJson(res, 200, list);
      }
      
      if (method === 'POST') {
        const { name, relation, age, gender, phone, email, preferredLanguage, notes, metadata } = body;
        if (!name || !relation) {
          return sendJson(res, 400, { error: 'Name and relation are required' });
        }
        const newProfile = await profiles.insertOne({
          userId,
          name,
          relation,
          age: age ? parseInt(age) : null,
          gender: gender || '',
          phone: phone || '',
          email: email || '',
          preferredLanguage: preferredLanguage || 'English',
          notes: notes || '',
          metadata: metadata || {}
        });
        return sendJson(res, 201, newProfile);
      }

      if (method === 'PUT') {
        const { id, _id, name, relation, age, gender, phone, email, preferredLanguage, notes, metadata } = body;
        const profileId = _id || id;
        if (!profileId) return sendJson(res, 400, { error: 'Profile ID is required' });
        const updated = await profiles.updateOne({ _id: profileId, userId }, {
          name,
          relation,
          age: age ? parseInt(age) : null,
          gender,
          phone,
          email,
          preferredLanguage,
          notes,
          metadata
        });
        return sendJson(res, 200, { success: updated });
      }

      if (method === 'DELETE') {
        const id = url.split('/').pop();
        if (!id || id === 'profiles') return sendJson(res, 400, { error: 'Profile ID is required' });
        const deleted = await profiles.deleteOne({ _id: id, userId });
        return sendJson(res, 200, { success: deleted });
      }
    }

    // Route: /api/preferences
    if (url === '/api/preferences') {
      const prefs = await getDbCollection('preferences');
      const userPrefs = await prefs.findOne({ userId });

      if (method === 'GET') {
        if (!userPrefs) {
          return sendJson(res, 200, {
            preferredHospitals: [],
            preferredDoctors: [],
            preferredSalons: [],
            preferredStylists: [],
            preferredAppointmentTimes: [],
            preferredLanguage: 'English',
            dislikedBusinesses: []
          });
        }
        return sendJson(res, 200, userPrefs);
      }

      if (method === 'POST') {
        const { preferredHospitals, preferredDoctors, preferredSalons, preferredStylists, preferredAppointmentTimes, preferredLanguage, dislikedBusinesses } = body;
        const updateData = {
          preferredHospitals: preferredHospitals || [],
          preferredDoctors: preferredDoctors || [],
          preferredSalons: preferredSalons || [],
          preferredStylists: preferredStylists || [],
          preferredAppointmentTimes: preferredAppointmentTimes || [],
          preferredLanguage: preferredLanguage || 'English',
          dislikedBusinesses: dislikedBusinesses || []
        };

        if (userPrefs) {
          await prefs.updateOne({ userId }, updateData);
          return sendJson(res, 200, { ...userPrefs, ...updateData });
        } else {
          const created = await prefs.insertOne({
            userId,
            ...updateData
          });
          return sendJson(res, 201, created);
        }
      }
    }

    // Route: /api/bookings
    if (url.startsWith('/api/bookings')) {
      const bookings = await getDbCollection('bookings');

      if (method === 'GET') {
        const list = await bookings.find({ userId });
        return sendJson(res, 200, list);
      }

      if (method === 'POST') {
        const { profileId, businessId, businessName, businessCategory, service, dateTime, status, categoryDetails, receptionistOutcome } = body;
        if (!businessName || !businessCategory || !service) {
          return sendJson(res, 400, { error: 'businessName, businessCategory, and service are required' });
        }
        const newBooking = await bookings.insertOne({
          userId,
          profileId: profileId || null,
          businessId: businessId || '',
          businessName,
          businessCategory,
          service,
          dateTime: dateTime ? new Date(dateTime).toISOString() : new Date().toISOString(),
          status: status || 'draft',
          categoryDetails: categoryDetails || {},
          receptionistOutcome: receptionistOutcome || {}
        });
        return sendJson(res, 201, newBooking);
      }

      if (method === 'PUT') {
        const { id, _id, status, receptionistOutcome, categoryDetails, dateTime } = body;
        const bookingId = _id || id;
        if (!bookingId) return sendJson(res, 400, { error: 'Booking ID is required' });
        
        const updateData: any = {};
        if (status) updateData.status = status;
        if (receptionistOutcome) updateData.receptionistOutcome = receptionistOutcome;
        if (categoryDetails) updateData.categoryDetails = categoryDetails;
        if (dateTime) updateData.dateTime = new Date(dateTime).toISOString();

        const updated = await bookings.updateOne({ _id: bookingId, userId }, updateData);
        return sendJson(res, 200, { success: updated });
      }
    }

    // Route: /api/feedback
    if (url === '/api/feedback') {
      const feedback = await getDbCollection('feedback');

      if (method === 'GET') {
        const list = await feedback.find({});
        return sendJson(res, 200, list);
      }

      if (method === 'POST') {
        const { bookingId, rating, comments, wouldVisitAgain } = body;
        if (!bookingId || !rating) {
          return sendJson(res, 400, { error: 'bookingId and rating are required' });
        }
        const newFeedback = await feedback.insertOne({
          bookingId,
          rating: parseInt(rating),
          comments: comments || '',
          wouldVisitAgain: wouldVisitAgain === undefined ? true : !!wouldVisitAgain
        });

        // Automatically blacklist if user rate <= 2 or does not want to visit again
        if (rating <= 2 || wouldVisitAgain === false) {
          const bookings = await getDbCollection('bookings');
          const booking = await bookings.findOne({ _id: bookingId, userId });
          if (booking && booking.businessName) {
            const prefs = await getDbCollection('preferences');
            const userPrefs = await prefs.findOne({ userId });
            const disliked = userPrefs?.dislikedBusinesses || [];
            if (!disliked.includes(booking.businessName)) {
              const updatedDisliked = [...disliked, booking.businessName];
              if (userPrefs) {
                await prefs.updateOne({ userId }, { dislikedBusinesses: updatedDisliked });
              } else {
                await prefs.insertOne({ userId, dislikedBusinesses: updatedDisliked });
              }
            }
          }
        }

        return sendJson(res, 201, newFeedback);
      }
    }

    return sendJson(res, 404, { error: 'Not Found' });

  } catch (err: any) {
    console.error('[API Error]', err);
    return sendJson(res, 500, { error: 'Internal Server Error', details: err?.message || String(err) });
  }
}

export function expressPlugin() {
  return {
    name: 'express-plugin',
    configureServer(server: any) {
      server.middlewares.use(apiMiddleware);
    }
  };
}
