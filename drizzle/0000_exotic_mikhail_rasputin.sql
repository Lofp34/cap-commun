CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL,
	`detail` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cockpit` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`payload` text NOT NULL,
	`operation` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`task_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`until` integer NOT NULL,
	`status` text NOT NULL,
	`result` text
);
