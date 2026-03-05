/**
 * Stats Controller
 */

import * as statsService from '../services/stats.service.js';

export const getOverviewStats = async (req, res) => {
  const data = await statsService.getOverviewStats();
  res.json({ status: 'success', data });
};

export const getBooksStats = async (req, res) => {
  const data = await statsService.getBooksStats();
  res.json({ status: 'success', data });
};

export const getUserStats = async (req, res) => {
  const data = await statsService.getUserStats();
  res.json({ status: 'success', data });
};

export const getRentalStats = async (req, res) => {
  const data = await statsService.getRentalStats();
  res.json({ status: 'success', data });
};

export const getRevenueStats = async (req, res) => {
  const data = await statsService.getRevenueStats();
  res.json({ status: 'success', data });
};
