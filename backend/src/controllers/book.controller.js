/**
 * Book Controller – Physical Books
 */

import * as bookService from '../services/book.service.js';

export const getBooks = async (req, res) => {
  const result = await bookService.getBooks(req.query);
  res.json({ status: 'success', ...result });
};

export const getAdminBooks = async (req, res) => {
  const result = await bookService.getAdminBooks(req.query);
  res.json({ status: 'success', ...result });
};

export const getBook = async (req, res) => {
  const userId = req.user?.id || null;
  const book = await bookService.getBookById(req.params.id, userId);
  res.json({ status: 'success', data: { book } });
};

export const getBookAvailability = async (req, res) => {
  const data = await bookService.getBookAvailability(req.params.id);
  res.json({ status: 'success', data });
};

export const createBook = async (req, res) => {
  const book = await bookService.createBook(req.body);
  res.status(201).json({ status: 'success', data: { book } });
};

export const updateBook = async (req, res) => {
  const book = await bookService.updateBook(req.params.id, req.body);
  res.json({ status: 'success', data: { book } });
};

export const deleteBook = async (req, res) => {
  await bookService.deleteBook(req.params.id);
  res.json({ status: 'success', message: 'Book soft-deleted successfully' });
};
