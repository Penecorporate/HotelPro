-- AlterTable
ALTER TABLE `HotelGuest` ADD COLUMN `idFileUrl` VARCHAR(191) NULL, ADD COLUMN `idFileName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `HotelReservation` ADD COLUMN `nightlyRate` DECIMAL(12, 2) NOT NULL DEFAULT 0;
UPDATE `HotelReservation` r JOIN `HotelRoom` rm ON rm.`id` = r.`roomId` SET r.`nightlyRate` = rm.`pricePerNight`;

-- CreateTable
CREATE TABLE `HotelPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `reservationId` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `method` ENUM('CASH', 'CARD', 'WAVE', 'ORANGE_MONEY') NOT NULL DEFAULT 'CASH',
    `reference` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HotelPayment_companyId_createdAt_idx`(`companyId`, `createdAt`),
    INDEX `HotelPayment_reservationId_idx`(`reservationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelExpense` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `method` ENUM('CASH', 'CARD', 'WAVE', 'ORANGE_MONEY') NOT NULL DEFAULT 'CASH',
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HotelExpense_companyId_date_idx`(`companyId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelService` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `reservationId` INTEGER NOT NULL,
    `guestId` INTEGER NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `date` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HotelService_companyId_idx`(`companyId`),
    INDEX `HotelService_reservationId_idx`(`reservationId`),
    INDEX `HotelService_guestId_idx`(`guestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelIncident` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `guestId` INTEGER NOT NULL,
    `reservationId` INTEGER NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'LOW',
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `resolved` BOOLEAN NOT NULL DEFAULT false,
    `date` DATE NOT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HotelIncident_companyId_idx`(`companyId`),
    INDEX `HotelIncident_guestId_idx`(`guestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HotelPayment` ADD CONSTRAINT `HotelPayment_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelPayment` ADD CONSTRAINT `HotelPayment_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `HotelReservation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelExpense` ADD CONSTRAINT `HotelExpense_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelService` ADD CONSTRAINT `HotelService_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelService` ADD CONSTRAINT `HotelService_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `HotelReservation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelService` ADD CONSTRAINT `HotelService_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `HotelGuest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelIncident` ADD CONSTRAINT `HotelIncident_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelIncident` ADD CONSTRAINT `HotelIncident_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `HotelGuest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelIncident` ADD CONSTRAINT `HotelIncident_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `HotelReservation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
