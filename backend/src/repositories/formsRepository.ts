import { prisma } from '../services/db';
import { Form, FormResponse } from '@prisma/client';
import crypto from 'crypto';

export async function createForm(data: { title: string; slug: string; description?: string | null; headerImage?: string | null; fields: any; sections?: any }): Promise<Form> {
  return prisma.form.create({
    data: {
      id: crypto.randomUUID(),
      title: data.title,
      slug: data.slug,
      description: data.description ?? null,
      headerImage: data.headerImage ?? null,
      fields: data.fields,
      sections: data.sections ?? null,
    },
  });
}

export async function listForms(): Promise<Form[]> {
  return prisma.form.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { responses: true } } } }) as any;
}

export async function getFormBySlug(slug: string): Promise<Form | null> {
  return prisma.form.findUnique({ where: { slug } });
}

export async function submitFormResponse(formId: string, answers: any, sourceIp?: string): Promise<FormResponse> {
  return prisma.formResponse.create({
    data: { id: crypto.randomUUID(), formId, answers, sourceIp },
  });
}

export async function updateForm(id: string, data: { title?: string; slug?: string; description?: string | null; headerImage?: string | null; fields?: any; sections?: any }): Promise<Form> {
  return prisma.form.update({
    where: { id },
    data,
  });
}

export async function listFormResponses(formId: string, limit = 50): Promise<FormResponse[]> {
  return prisma.formResponse.findMany({
    where: { formId },
    orderBy: { submittedAt: 'desc' },
    take: limit,
  });
}

export async function deleteForm(id: string): Promise<void> {
  await prisma.formResponse.deleteMany({ where: { formId: id } });
  await prisma.form.delete({ where: { id } });
}
