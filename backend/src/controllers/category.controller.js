/**
 * Category Controller
 */

import * as categoryService from '../services/category.service.js';

export const getCategories = async (req, res) => {
  const result = await categoryService.getCategories(req.query);
  res.json({ status: 'success', ...result });
};

export const getCategory = async (req, res) => {
  const result = await categoryService.getCategoryBySlugOrId(req.params.slugOrId, req.query);
  res.json({ status: 'success', data: result });
};

export const createCategory = async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ status: 'success', data: { category } });
};

export const updateCategory = async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  res.json({ status: 'success', data: { category } });
};

export const deleteCategory = async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  res.json({ status: 'success', message: 'Category deleted successfully' });
};
