ALTER TABLE `alerts` MODIFY COLUMN `officeId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `branches` MODIFY COLUMN `officeId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` MODIFY COLUMN `officeId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `officeId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `maintenance` MODIFY COLUMN `officeId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` MODIFY COLUMN `officeId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `emailVerified` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `vehicles` MODIFY COLUMN `officeId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `offices` MODIFY COLUMN `isActive` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `offices` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `offices` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `office_members` MODIFY COLUMN `isActive` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `office_members` MODIFY COLUMN `joinedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `office_members` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `invitations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_token_unique` UNIQUE(`token`);--> statement-breakpoint
