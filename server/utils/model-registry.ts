// server/utils/model-registry.ts
import mongoose from 'mongoose';
import User from '~/server/models/Users';
import Request from '~/server/models/Requests';
import Component from '~/server/models/Components';
import Log from '~/server/models/Logs';
import RateLimit from '~/server/models/RateLimit';

// Force model registration by accessing them
// This ensures all schemas are compiled and registered with mongoose
export function registerAllModels() {
  const models = {
    User: mongoose.models.User || User,
    Request: mongoose.models.Request || Request,
    Component: mongoose.models.Component || Component,
    Log: mongoose.models.Log || Log,
    RateLimit: mongoose.models.RateLimit || RateLimit,
  };


  return models;
}

// Helper to check if models are registered
export function checkModelRegistration() {
  return {
    User: !!mongoose.models.User,
    Request: !!mongoose.models.Request,
    Component: !!mongoose.models.Component,
    Log: !!mongoose.models.Log,
    RateLimit: !!mongoose.models.RateLimit,
  };
}