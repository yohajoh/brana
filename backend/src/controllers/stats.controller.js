/**
 * Stats Controller
 */

import * as statsService from '../services/stats.service.js';

const STATS_CACHE_TTL_MS = Number(process.env.STATS_CACHE_TTL_MS || 30_000);
const statsCache = new Map();

const getCached = async (key, resolver, ttlMs = STATS_CACHE_TTL_MS) => {
  const now = Date.now();
  const hit = statsCache.get(key);
  if (hit && hit.expiresAt > now) return hit.value;

  const value = await resolver();
  statsCache.set(key, {
    value,
    expiresAt: now + ttlMs,
  });
  return value;
};

const clearStatsCache = () => {
  statsCache.clear();
};

export const getOverviewStats = async (req, res) => {
  const data = await getCached('overview', () => statsService.getOverviewStats());
  res.json({ status: 'success', data });
};

export const getBooksStats = async (req, res) => {
  const data = await getCached('books', () => statsService.getBooksStats());
  res.json({ status: 'success', data });
};

export const getUserStats = async (req, res) => {
  const data = await getCached('users', () => statsService.getUserStats());
  res.json({ status: 'success', data });
};

export const getRentalStats = async (req, res) => {
  const data = await getCached('rentals', () => statsService.getRentalStats());
  res.json({ status: 'success', data });
};

export const getRevenueStats = async (req, res) => {
  const data = await getCached('revenue', () => statsService.getRevenueStats());
  res.json({ status: 'success', data });
};

export const getCurrentMonthTarget = async (req, res) => {
  const data = await getCached('target:current', () => statsService.getCurrentMonthTarget(), 10_000);
  res.json({ status: 'success', data });
};

export const upsertCurrentMonthTarget = async (req, res) => {
  const data = await statsService.upsertCurrentMonthTarget(req.user.id, req.body);
  clearStatsCache();
  res.json({ status: 'success', data });
};
