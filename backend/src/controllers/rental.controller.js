/**
 * Rental Controller
 */

import * as rentalService from '../services/rental.service.js';

const getIo = (req) => req.app.locals.io;

export const getAllRentals = async (req, res) => {
  const result = await rentalService.getAllRentals(req.query);
  res.json({ status: 'success', ...result });
};

export const getMyRentals = async (req, res) => {
  const result = await rentalService.getMyRentals(req.user.id, req.query);
  res.json({ status: 'success', ...result });
};

export const getRental = async (req, res) => {
  const rental = await rentalService.getRentalById(req.params.id, req.user);
  res.json({ status: 'success', data: { rental } });
};

export const borrowBook = async (req, res) => {
  const rental = await rentalService.borrowBook(req.user.id, req.body, getIo(req));
  res.status(201).json({ status: 'success', data: { rental } });
};

export const returnBook = async (req, res) => {
  const result = await rentalService.returnBook(req.params.id, getIo(req));
  res.json({ status: 'success', data: result });
};

export const getOverdueRentals = async (req, res) => {
  const result = await rentalService.getOverdueRentals(req.query);
  res.json({ status: 'success', ...result });
};

export const sendOverdueReminders = async (req, res) => {
  const result = await rentalService.sendOverdueReminders(getIo(req));
  res.json({ status: 'success', data: result });
};

export const extendRental = async (req, res) => {
  const result = await rentalService.extendRental(req.params.id, req.body, getIo(req));
  res.json({ status: 'success', data: { rental: result } });
};
