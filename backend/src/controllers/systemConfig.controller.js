/**
 * System Config Controller
 */

import * as systemConfigService from '../services/systemConfig.service.js';

export const getConfig = async (req, res) => {
  const config = await systemConfigService.getConfig();
  res.json({ status: 'success', data: { config } });
};

export const updateConfig = async (req, res) => {
  const io = req.app.locals.io;
  const config = await systemConfigService.updateConfig(req.user.id, req.body, io);
  res.json({ status: 'success', data: { config } });
};
