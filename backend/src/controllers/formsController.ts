import { Request, Response } from 'express';
import { createForm, getFormBySlug, listForms, submitFormResponse, updateForm, listFormResponses, deleteForm } from '../repositories/formsRepository';

export async function listFormsController(_req: Request, res: Response) {
  try {
    const forms = await listForms();
    res.json(forms);
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to list forms' });
  }
}

export async function createFormController(req: Request, res: Response) {
  try {
    const { title, slug, description, headerImage, fields, sections } = req.body;
    if (!title || !slug || !fields) return res.status(400).json({ message: 'title, slug, fields are required' });
    const form = await createForm({ title, slug, description, headerImage, fields, sections });
    res.status(201).json(form);
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to create form' });
  }
}

export async function updateFormController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, slug, description, headerImage, fields, sections } = req.body;
    const form = await updateForm(id, { title, slug, description, headerImage, fields, sections });
    res.json(form);
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to update form' });
  }
}

export async function getFormPublicController(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const form = await getFormBySlug(slug);
    if (!form) return res.status(404).json({ message: 'Form not found' });
    res.json(form);
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to fetch form' });
  }
}

export async function submitFormController(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const form = await getFormBySlug(slug);
    if (!form) return res.status(404).json({ message: 'Form not found' });
    const answers = req.body?.answers ?? req.body;
    const resp = await submitFormResponse(form.id, answers, req.ip);
    res.status(201).json(resp);
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to submit form' });
  }
}

export async function listFormResponsesController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const responses = await listFormResponses(id);
    res.json(responses);
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to fetch responses' });
  }
}

export async function deleteFormController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await deleteForm(id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to delete form' });
  }
}
