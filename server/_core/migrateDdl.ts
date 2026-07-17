export const MIGRATE_DDL = `
CREATE TABLE IF NOT EXISTS \`alerts\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) NOT NULL,
  \`type\` varchar(100) NOT NULL,
  \`title\` varchar(500) NOT NULL,
  \`message\` text DEFAULT NULL,
  \`relatedEntity\` varchar(100) DEFAULT NULL,
  \`relatedId\` int(11) DEFAULT NULL,
  \`isRead\` tinyint(1) NOT NULL DEFAULT 0,
  \`readAt\` timestamp NULL DEFAULT NULL,
  \`branchId\` int(11) DEFAULT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`audit_logs\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) DEFAULT NULL,
  \`userId\` int(11) DEFAULT NULL,
  \`action\` varchar(100) NOT NULL,
  \`entityType\` varchar(100) NOT NULL,
  \`entityId\` int(11) DEFAULT NULL,
  \`oldValue\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(\`oldValue\`)),
  \`newValue\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(\`newValue\`)),
  \`reason\` text DEFAULT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`branches\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`city\` varchar(255) DEFAULT NULL,
  \`address\` text DEFAULT NULL,
  \`phone\` varchar(50) DEFAULT NULL,
  \`email\` varchar(320) DEFAULT NULL,
  \`isActive\` tinyint(1) NOT NULL DEFAULT 1,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updatedAt\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`contracts\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) NOT NULL,
  \`contractNumber\` varchar(50) NOT NULL,
  \`reservationId\` int(11) DEFAULT NULL,
  \`customerId\` int(11) NOT NULL,
  \`vehicleId\` int(11) NOT NULL,
  \`branchId\` int(11) NOT NULL,
  \`startDate\` timestamp NOT NULL,
  \`endDate\` timestamp NOT NULL,
  \`startMileage\` int(11) DEFAULT NULL,
  \`endMileage\` int(11) DEFAULT NULL,
  \`dailyRate\` decimal(10,2) NOT NULL,
  \`totalDays\` int(11) NOT NULL,
  \`basePrice\` decimal(10,2) NOT NULL,
  \`discount\` decimal(10,2) DEFAULT 0.00,
  \`additionalCharges\` decimal(10,2) DEFAULT 0.00,
  \`finalPrice\` decimal(10,2) DEFAULT NULL,
  \`status\` enum('draft','active','completed','cancelled') NOT NULL DEFAULT 'draft',
  \`pdfUrl\` text DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  \`createdBy\` int(11) DEFAULT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updatedAt\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`customers\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`idNumber\` varchar(50) DEFAULT NULL,
  \`licenseNumber\` varchar(50) DEFAULT NULL,
  \`phone\` varchar(50) NOT NULL,
  \`email\` varchar(320) DEFAULT NULL,
  \`address\` text DEFAULT NULL,
  \`city\` varchar(255) DEFAULT NULL,
  \`isBlacklisted\` tinyint(1) NOT NULL DEFAULT 0,
  \`blacklistReason\` text DEFAULT NULL,
  \`blacklistedAt\` timestamp NULL DEFAULT NULL,
  \`idImageKey\` varchar(512) DEFAULT NULL,
  \`idImageUrl\` varchar(512) DEFAULT NULL,
  \`licenseImageKey\` varchar(512) DEFAULT NULL,
  \`licenseImageUrl\` varchar(512) DEFAULT NULL,
  \`isActive\` tinyint(1) NOT NULL DEFAULT 1,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updatedAt\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`handovers\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) DEFAULT NULL,
  \`contractId\` int(11) NOT NULL,
  \`mileage\` int(11) NOT NULL,
  \`fuelLevel\` varchar(50) DEFAULT NULL,
  \`photos\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(\`photos\`)),
  \`notes\` text DEFAULT NULL,
  \`createdBy\` int(11) DEFAULT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`invitations\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) NOT NULL,
  \`invitedBy\` int(11) NOT NULL,
  \`email\` varchar(320) NOT NULL,
  \`inviteRole\` enum('admin','staff','accountant') NOT NULL DEFAULT 'staff',
  \`permissions\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(\`permissions\`)),
  \`token\` varchar(128) NOT NULL,
  \`inviteStatus\` enum('pending','accepted','cancelled','expired') NOT NULL DEFAULT 'pending',
  \`expiresAt\` timestamp NOT NULL,
  \`acceptedAt\` timestamp NULL DEFAULT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`invitations_token_unique\` (\`token\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`maintenance\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) NOT NULL,
  \`vehicleId\` int(11) NOT NULL,
  \`type\` enum('scheduled','unscheduled','preventive') NOT NULL DEFAULT 'scheduled',
  \`reason\` text NOT NULL,
  \`cost\` decimal(10,2) DEFAULT NULL,
  \`odometerAtService\` int(11) DEFAULT NULL,
  \`startDate\` timestamp NOT NULL,
  \`endDate\` timestamp NULL DEFAULT NULL,
  \`nextDueOdometer\` int(11) DEFAULT NULL,
  \`nextDueDate\` timestamp NULL DEFAULT NULL,
  \`maintenanceStatus\` enum('scheduled','in_progress','completed') NOT NULL DEFAULT 'scheduled',
  \`notes\` text DEFAULT NULL,
  \`createdBy\` int(11) DEFAULT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updatedAt\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`office_members\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) NOT NULL,
  \`userId\` int(11) NOT NULL,
  \`memberRole\` enum('owner','admin','staff','accountant') NOT NULL DEFAULT 'staff',
  \`permissions\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(\`permissions\`)),
  \`isActive\` tinyint(1) NOT NULL DEFAULT 1,
  \`joinedAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updatedAt\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`offices\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`name\` varchar(255) NOT NULL,
  \`city\` varchar(255) DEFAULT NULL,
  \`address\` text DEFAULT NULL,
  \`phone\` varchar(50) DEFAULT NULL,
  \`email\` varchar(320) DEFAULT NULL,
  \`plan\` enum('trial','starter','professional','enterprise') NOT NULL DEFAULT 'trial',
  \`isActive\` tinyint(1) NOT NULL DEFAULT 1,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updatedAt\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`otp_codes\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`email\` varchar(320) NOT NULL,
  \`code\` varchar(6) NOT NULL,
  \`expiresAt\` timestamp NOT NULL,
  \`used\` tinyint(1) NOT NULL DEFAULT 0,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`payments\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) DEFAULT NULL,
  \`contractId\` int(11) NOT NULL,
  \`amount\` decimal(10,2) NOT NULL,
  \`method\` enum('cash','card','bank_transfer','stc_pay') NOT NULL DEFAULT 'cash',
  \`paidAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`recordedBy\` int(11) DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`refresh_tokens\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`userId\` int(11) NOT NULL,
  \`token\` varchar(512) NOT NULL,
  \`expiresAt\` timestamp NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`refresh_tokens_token_unique\` (\`token\`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`reservations\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) NOT NULL,
  \`customerId\` int(11) NOT NULL,
  \`vehicleId\` int(11) NOT NULL,
  \`startDate\` timestamp NOT NULL,
  \`endDate\` timestamp NOT NULL,
  \`status\` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  \`notes\` text DEFAULT NULL,
  \`createdBy\` int(11) DEFAULT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updatedAt\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`returns\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) DEFAULT NULL,
  \`contractId\` int(11) NOT NULL,
  \`mileage\` int(11) NOT NULL,
  \`fuelLevel\` varchar(50) DEFAULT NULL,
  \`photos\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(\`photos\`)),
  \`damageNotes\` text DEFAULT NULL,
  \`damageAmount\` decimal(10,2) DEFAULT 0.00,
  \`lateFees\` decimal(10,2) DEFAULT 0.00,
  \`additionalKmFees\` decimal(10,2) DEFAULT 0.00,
  \`createdBy\` int(11) DEFAULT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`transfers\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) DEFAULT NULL,
  \`vehicleId\` int(11) NOT NULL,
  \`fromBranchId\` int(11) NOT NULL,
  \`toBranchId\` int(11) NOT NULL,
  \`status\` enum('initiated','in_transit','received') NOT NULL DEFAULT 'initiated',
  \`initiatedBy\` int(11) DEFAULT NULL,
  \`receivedBy\` int(11) DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  \`initiatedAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`receivedAt\` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`openId\` varchar(64) NOT NULL,
  \`name\` text DEFAULT NULL,
  \`email\` varchar(320) DEFAULT NULL,
  \`loginMethod\` varchar(64) DEFAULT NULL,
  \`userType\` enum('owner','employee') NOT NULL DEFAULT 'employee',
  \`officeId\` int(11) DEFAULT NULL,
  \`role\` enum('owner','admin','staff','accountant') NOT NULL DEFAULT 'staff',
  \`isActive\` tinyint(1) NOT NULL DEFAULT 0,
  \`passwordHash\` varchar(255) DEFAULT NULL,
  \`emailVerified\` tinyint(1) NOT NULL DEFAULT 0,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updatedAt\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  \`lastSignedIn\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`users_openId_unique\` (\`openId\`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`vehicle_documents\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) NOT NULL,
  \`vehicleId\` int(11) NOT NULL,
  \`docType\` enum('insurance','registration','inspection') NOT NULL,
  \`documentUrl\` text DEFAULT NULL,
  \`expiryDate\` timestamp NULL DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`vehicle_history\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) DEFAULT NULL,
  \`vehicleId\` int(11) NOT NULL,
  \`eventType\` varchar(50) NOT NULL,
  \`description\` text DEFAULT NULL,
  \`relatedId\` int(11) DEFAULT NULL,
  \`relatedType\` varchar(50) DEFAULT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS \`vehicles\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`officeId\` int(11) NOT NULL,
  \`plateNumber\` varchar(20) NOT NULL,
  \`brand\` varchar(100) NOT NULL,
  \`model\` varchar(100) NOT NULL,
  \`year\` int(11) NOT NULL,
  \`color\` varchar(50) DEFAULT NULL,
  \`category\` enum('economy','family','luxury') NOT NULL DEFAULT 'economy',
  \`currentMileage\` int(11) NOT NULL DEFAULT 0,
  \`status\` enum('available','reserved','rented','late','maintenance','in_transfer') NOT NULL DEFAULT 'available',
  \`dailyRate\` decimal(10,2) NOT NULL,
  \`weeklyRate\` decimal(10,2) DEFAULT NULL,
  \`monthlyRate\` decimal(10,2) DEFAULT NULL,
  \`branchId\` int(11) NOT NULL,
  \`isActive\` tinyint(1) NOT NULL DEFAULT 1,
  \`createdAt\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updatedAt\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
`;
