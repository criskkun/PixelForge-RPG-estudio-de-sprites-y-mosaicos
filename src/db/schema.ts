import { pgTable, serial, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table linked to Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  credits: integer('credits').notNull().default(100),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Projects table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description').default(''),
  width: integer('width').notNull().default(32),
  height: integer('height').notNull().default(32),
  palette: text('palette').notNull().default('[]'),
  layers: text('layers').notNull().default('[]'),
  animations: text('animations').notNull().default('{}'),
  thumbnail: text('thumbnail').default(''),
  tags: text('tags').default(''),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Library assets table (characters, objects, animations, tilesets, environments, UI, palettes)
export const libraryAssets = pgTable('library_assets', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  category: text('category').notNull(), // 'character' | 'object' | 'animation' | 'tileset' | 'environment' | 'ui' | 'palette' | 'brush'
  name: text('name').notNull(),
  dimensions: text('dimensions').notNull().default('32x32'),
  tags: text('tags').default(''),
  data: text('data').notNull(), // JSON payload of asset
  thumbnail: text('thumbnail').default(''),
  source: text('source').notNull().default('custom'), // 'pixellab' | 'custom' | 'gemini'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// PixelLab background jobs log
export const pixellabJobs = pgTable('pixellab_jobs', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  jobId: text('job_id').notNull().unique(),
  endpoint: text('endpoint').notNull(),
  prompt: text('prompt'),
  status: text('status').notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed'
  resultData: text('result_data'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Cloud storage files table
export const storageFiles = pgTable('storage_files', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull().default(0),
  url: text('url').notNull(),
  category: text('category').default('general'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  libraryAssets: many(libraryAssets),
  jobs: many(pixellabJobs),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  owner: one(users, {
    fields: [projects.userId],
    references: [users.uid],
  }),
}));
