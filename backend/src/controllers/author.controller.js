/**
 * Author Controller
 */

import * as authorService from '../services/author.service.js';

export const getAuthors = async (req, res) => {
  const result = await authorService.getAuthors(req.query);
  res.json({ status: 'success', ...result });
};

export const getAuthor = async (req, res) => {
  const author = await authorService.getAuthorById(req.params.id);
  res.json({ status: 'success', data: { author } });
};

export const createAuthor = async (req, res) => {
  const imageFile = req.file || null;
  const author = await authorService.createAuthor(req.body, imageFile);
  res.status(201).json({ status: 'success', data: { author } });
};

export const updateAuthor = async (req, res) => {
  const imageFile = req.file || null;
  const author = await authorService.updateAuthor(req.params.id, req.body, imageFile);
  res.json({ status: 'success', data: { author } });
};

export const deleteAuthor = async (req, res) => {
  await authorService.deleteAuthor(req.params.id);
  res.json({ status: 'success', message: 'Author deleted successfully' });
};
