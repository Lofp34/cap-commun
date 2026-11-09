import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
export const cockpit = sqliteTable('cockpit', {id:integer('id').primaryKey(),revision:integer('revision').notNull(),payload:text('payload').notNull(),operation:text('operation').notNull()});
export const audit = sqliteTable('audit',{id:text('id').primaryKey(),at:text('at').notNull(),actor:text('actor').notNull(),detail:text('detail').notNull()});
export const jobs = sqliteTable('jobs',{taskId:text('task_id').primaryKey(),token:text('token').notNull(),until:integer('until').notNull(),status:text('status').notNull(),result:text('result')});
