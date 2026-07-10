CREATE TABLE `inspection_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`officeId` int NOT NULL,
	`templateId` int NOT NULL,
	`contractId` int NOT NULL,
	`vehicleId` int,
	`submissionContext` enum('handover','return') NOT NULL,
	`answers` json NOT NULL,
	`submittedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspection_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspection_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`officeId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`context` enum('handover','return','both') NOT NULL DEFAULT 'both',
	`fields` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspection_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `handovers` ADD `fuelCost` decimal(10,2);--> statement-breakpoint
ALTER TABLE `handovers` ADD `fuelLiters` decimal(8,2);--> statement-breakpoint
ALTER TABLE `returns` ADD `fuelCost` decimal(10,2);--> statement-breakpoint
ALTER TABLE `returns` ADD `fuelLiters` decimal(8,2);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `tags` json;