// server/utils/db.ts
import mongoose from "mongoose";
import { useRuntimeConfig } from "#imports";
import { registerAllModels, checkModelRegistration } from "./model-registry";

// Define the cached connection type
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Declare global mongoose cache
declare global {
  var mongoose: MongooseCache;
}

// Initialize cache
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

export default async function connectDB(retries = 3, delay = 1000): Promise<typeof mongoose> {
  const config = useRuntimeConfig();
  const uri = config.MONGO_URI || "";

  if (!uri) {
    throw new Error("MONGO_URI not set – configure it in your environment");
  }

  // If we already have a connection, use it
  if (cached.conn) {
    // Check if models are registered, if not, register them
    const registration = checkModelRegistration();
    if (!Object.values(registration).every(Boolean)) {
      console.log('⚠️ Models missing, re-registering...');
      registerAllModels();
    }
    return cached.conn;
  }

  // If we don't have a connection promise, create one with proper options
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 5000,
      retryWrites: true,
      retryReads: true,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 30000,
    };

    console.log('🔄 Connecting to MongoDB...');
    
    cached.promise = mongoose.connect(uri, opts)
      .then(async (mongoose) => {
        console.log('✅ MongoDB connected successfully');
        
        // Register all models immediately after connection
        registerAllModels();
        
        // Verify registration
        const registration = checkModelRegistration();
        console.log('📊 Model registration status:', registration);
        
        return mongoose;
      })
      .catch((error) => {
        console.error('❌ Database connection error:', error);
        cached.promise = null; // Reset promise on error
        throw error;
      });
  }

  // Try to connect with retries
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      cached.conn = await cached.promise;
      
      // Double-check models are registered
      registerAllModels();
      
      return cached.conn;
    } catch (error) {
      lastError = error;
      
      if (i < retries - 1) {
        // Exponential backoff
        const nextDelay = delay * Math.pow(2, i);
        console.log(`Retrying in ${nextDelay}ms... (Attempt ${i + 2}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, nextDelay));
        
        // Reset promise for retry with increased timeout
        const opts = {
          bufferCommands: false,
          serverSelectionTimeoutMS: 5000 * (i + 2),
          socketTimeoutMS: 45000,
          family: 4,
          maxPoolSize: 10,
          minPoolSize: 1,
          maxIdleTimeMS: 30000,
          waitQueueTimeoutMS: 5000,
          retryWrites: true,
          retryReads: true,
          connectTimeoutMS: 10000 * (i + 1),
          heartbeatFrequencyMS: 30000,
        };
        
        cached.promise = mongoose.connect(uri, opts)
          .then(async (mongoose) => {
            console.log('✅ MongoDB connected successfully on retry');
            registerAllModels();
            return mongoose;
          })
          .catch((error) => {
            console.error('❌ Database connection error on retry:', error);
            cached.promise = null;
            throw error;
          });
      }
    }
  }

  // If we get here, all retries failed
  cached.promise = null;
  throw lastError || new Error('Failed to connect to database after multiple retries');
}

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  cached.conn = null;
  cached.promise = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
  cached.conn = null;
  cached.promise = null;
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
  // Re-register models on reconnect
  registerAllModels();
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
  // Re-register models on reconnect
  registerAllModels();
});

// Helper function to check connection status
export function getConnectionStatus() {
  return {
    isConnected: !!cached.conn,
    readyState: cached.conn ? cached.conn.connection.readyState : 0,
    hasPromise: !!cached.promise,
    models: checkModelRegistration()
  };
}