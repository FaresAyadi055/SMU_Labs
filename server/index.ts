// server/index.ts
import connectDB from './utils/db';

export default async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
};