import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().min(1) });
const strongPassword = z.string()
  .min(6, 'Password must be at least 6 characters')
  .max(128)
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: 'Password must include both letters and numbers'
  });

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email().max(160).transform((email) => email.toLowerCase()),
  password: strongPassword,
  confirmPassword: strongPassword
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
  rememberMe: z.boolean().optional()
});

const projectFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  team: z.string().trim().min(1, 'Team is required').max(120),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable()
});

export const projectCreateSchema = projectFieldsSchema.refine((data) => {
  if (data.dueDate && new Date(data.dueDate) < new Date()) return false;
  if (!data.startDate || !data.dueDate) return true;
  return new Date(data.dueDate) >= new Date(data.startDate);
}, {
  message: 'Due date cannot be in the past or before start date',
  path: ['dueDate']
});

export const projectUpdateSchema = projectFieldsSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required'
}).refine((data) => {
  if (data.dueDate && new Date(data.dueDate) < new Date()) return false;
  if (!data.startDate || !data.dueDate) return true;
  return new Date(data.dueDate) >= new Date(data.startDate);
}, {
  message: 'Due date cannot be in the past or before start date',
  path: ['dueDate']
});

export const addMemberSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  role: z.enum(['ADMIN', 'MEMBER']).optional().default('MEMBER')
});

export const projectMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER'])
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(160),
  description: z.string().trim().max(1500).optional().nullable(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedTime: z.string().trim().max(60).optional().nullable(),
  projectId: z.string().min(1, 'Task must belong to a project'),
  assignedTo: z.string().min(1, 'Assignee is required')
}).refine((data) => {
  if (!data.startDate || !data.dueDate) return true;
  return new Date(data.dueDate) >= new Date(data.startDate);
}, {
  message: 'Due date cannot be before start date',
  path: ['dueDate']
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(160).optional(),
  description: z.string().trim().max(1500).optional().nullable(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedTime: z.string().trim().max(60).optional().nullable(),
  assignedTo: z.string().min(1).optional().nullable(),
  projectId: z.string().min(1).optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required'
}).refine((data) => {
  if (!data.startDate || !data.dueDate) return true;
  return new Date(data.dueDate) >= new Date(data.startDate);
}, {
  message: 'Due date cannot be before start date',
  path: ['dueDate']
});

export const presenceSchema = z.object({
  presence: z.enum(['ACTIVE', 'IDLE', 'AWAY', 'DND'])
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email().max(160).transform((email) => email.toLowerCase()),
  password: strongPassword,
  role: z.enum(['ADMIN', 'MEMBER']).optional().default('MEMBER'),
  isActive: z.boolean().optional().default(true)
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(160).transform((email) => email.toLowerCase()).optional(),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
  isActive: z.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required'
});

export const userSelfUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80)
});

export const userPasswordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: strongPassword,
  confirmPassword: strongPassword
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New password and confirm password must match',
  path: ['confirmPassword']
});

export const taskCommentCreateSchema = z.object({
  message: z.string().trim().min(1, 'Comment message is required').max(1200)
});
