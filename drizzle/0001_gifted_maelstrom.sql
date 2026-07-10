CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(500) NOT NULL,
	`message` text,
	`relatedEntity` varchar(100),
	`relatedId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`branchId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int,
	`oldValue` json,
	`newValue` json,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`city` varchar(255),
	`address` text,
	`phone` varchar(50),
	`email` varchar(320),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractNumber` varchar(50) NOT NULL,
	`reservationId` int,
	`customerId` int NOT NULL,
	`vehicleId` int NOT NULL,
	`branchId` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`startMileage` int,
	`endMileage` int,
	`dailyRate` decimal(10,2) NOT NULL,
	`totalDays` int NOT NULL,
	`basePrice` decimal(10,2) NOT NULL,
	`discount` decimal(10,2) DEFAULT '0',
	`additionalCharges` decimal(10,2) DEFAULT '0',
	`finalPrice` decimal(10,2),
	`status` enum('draft','active','completed','cancelled') NOT NULL DEFAULT 'draft',
	`pdfUrl` text,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `contracts_contractNumber_unique` UNIQUE(`contractNumber`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`idNumber` varchar(50),
	`licenseNumber` varchar(50),
	`phone` varchar(50) NOT NULL,
	`email` varchar(320),
	`address` text,
	`city` varchar(255),
	`isBlacklisted` boolean NOT NULL DEFAULT false,
	`blacklistReason` text,
	`blacklistedAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_idNumber_unique` UNIQUE(`idNumber`),
	CONSTRAINT `customers_licenseNumber_unique` UNIQUE(`licenseNumber`)
);
--> statement-breakpoint
CREATE TABLE `handovers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`mileage` int NOT NULL,
	`fuelLevel` varchar(50),
	`photos` json,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `handovers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`type` enum('scheduled','unscheduled','preventive') NOT NULL DEFAULT 'scheduled',
	`reason` text NOT NULL,
	`cost` decimal(10,2),
	`odometerAtService` int,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`nextDueOdometer` int,
	`nextDueDate` timestamp,
	`maintenanceStatus` enum('scheduled','in_progress','completed') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`method` enum('cash','card','bank_transfer','stc_pay') NOT NULL DEFAULT 'cash',
	`paidAt` timestamp NOT NULL DEFAULT (now()),
	`recordedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`vehicleId` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`mileage` int NOT NULL,
	`fuelLevel` varchar(50),
	`photos` json,
	`damageNotes` text,
	`damageAmount` decimal(10,2) DEFAULT '0',
	`lateFees` decimal(10,2) DEFAULT '0',
	`additionalKmFees` decimal(10,2) DEFAULT '0',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`fromBranchId` int NOT NULL,
	`toBranchId` int NOT NULL,
	`status` enum('initiated','in_transit','received') NOT NULL DEFAULT 'initiated',
	`initiatedBy` int,
	`receivedBy` int,
	`notes` text,
	`initiatedAt` timestamp NOT NULL DEFAULT (now()),
	`receivedAt` timestamp,
	CONSTRAINT `transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`docType` enum('insurance','registration','inspection') NOT NULL,
	`documentUrl` text,
	`expiryDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehicle_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`description` text,
	`relatedId` int,
	`relatedType` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehicle_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plateNumber` varchar(20) NOT NULL,
	`brand` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`year` int NOT NULL,
	`color` varchar(50),
	`category` enum('economy','family','luxury') NOT NULL DEFAULT 'economy',
	`currentMileage` int NOT NULL DEFAULT 0,
	`status` enum('available','reserved','rented','late','maintenance','in_transfer') NOT NULL DEFAULT 'available',
	`dailyRate` decimal(10,2) NOT NULL,
	`weeklyRate` decimal(10,2),
	`monthlyRate` decimal(10,2),
	`branchId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicles_plateNumber_unique` UNIQUE(`plateNumber`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','staff','accountant') NOT NULL DEFAULT 'staff';--> statement-breakpoint
ALTER TABLE `users` ADD `branchId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;