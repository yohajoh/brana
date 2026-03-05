/**
 * Payment Controller
 */

import * as paymentService from '../services/payment.service.js';

const getIo = (req) => req.app.locals.io;

export const initiatePayment = async (req, res) => {
  const result = await paymentService.initiatePayment(
    req.params.rentalId,
    req.user.id,
    req.body,
    getIo(req)
  );
  res.status(201).json({ status: 'success', data: result });
};

export const handleWebhook = async (req, res) => {
  const signature = req.headers['chapa-signature'] || req.headers['x-chapa-signature'] || '';
  const rawPayload = req.rawBody || JSON.stringify(req.body); // needs rawBody middleware
  const result = await paymentService.handleWebhook(rawPayload, req.body, signature, getIo(req));
  res.json({ status: 'success', data: result });
};

export const recordCashPayment = async (req, res) => {
  const result = await paymentService.recordCashPayment(
    req.params.paymentId,
    req.user.id,
    getIo(req)
  );
  res.json({ status: 'success', data: result });
};

export const getMyPayments = async (req, res) => {
  const result = await paymentService.getMyPayments(req.user.id, req.query);
  res.json({ status: 'success', ...result });
};

export const getAllPayments = async (req, res) => {
  const result = await paymentService.getAllPayments(req.query);
  res.json({ status: 'success', ...result });
};
