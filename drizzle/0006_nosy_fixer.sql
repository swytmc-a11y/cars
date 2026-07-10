CREATE TABLE `vehicle_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`officeId` int NOT NULL,
	`vehicleId` int NOT NULL,
	`lat` decimal(10,7) NOT NULL,
	`lng` decimal(11,7) NOT NULL,
	`speed` decimal(6,2),
	`heading` int,
	`source` varchar(50) NOT NULL DEFAULT 'manual',
	`recordedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehicle_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `payments` ADD `pdfUrl` text;