/**
 * Digital Book Controller
 */

import * as digitalBookService from '../services/digitalBook.service.js';

export const getDigitalBooks = async (req, res) => {
  const result = await digitalBookService.getDigitalBooks(req.query, req.user || null);
  res.json({ status: 'success', ...result });
};

export const getAdminDigitalBooks = async (req, res) => {
  const result = await digitalBookService.getAdminDigitalBooks(req.query);
  res.json({ status: 'success', ...result });
};

export const getDigitalBook = async (req, res) => {
  const userId = req.user?.id || null;
  const book = await digitalBookService.getDigitalBookById(req.params.id, userId);
  res.json({ status: 'success', data: { book } });
};

export const streamPdf = async (req, res) => {
  const { bytes, fileName } = await digitalBookService.getPdfBytes(req.params.id, req.user);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${fileName}"`,
    'Content-Length': bytes.length,
    'Cache-Control': 'private, max-age=3600',
  });
  res.send(bytes);
};

export const createDigitalBook = async (req, res) => {
  const pdfFile = req.file || null;
  const book = await digitalBookService.createDigitalBook(req.body, pdfFile);
  res.status(201).json({ status: 'success', data: { book } });
};

export const updateDigitalBook = async (req, res) => {
  const pdfFile = req.file || null;
  const book = await digitalBookService.updateDigitalBook(req.params.id, req.body, pdfFile);
  res.json({ status: 'success', data: { book } });
};

export const deleteDigitalBook = async (req, res) => {
  await digitalBookService.deleteDigitalBook(req.params.id);
  res.json({ status: 'success', message: 'Digital book soft-deleted successfully' });
};
