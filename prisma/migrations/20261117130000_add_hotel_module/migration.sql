-- CreateTable
CREATE TABLE `HotelRoom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'Standard',
    `floor` INTEGER NULL,
    `capacity` INTEGER NOT NULL DEFAULT 2,
    `pricePerNight` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HotelRoom_companyId_idx`(`companyId`),
    UNIQUE INDEX `HotelRoom_companyId_number_key`(`companyId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelGuest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL,
    `idType` VARCHAR(191) NULL,
    `idNumber` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HotelGuest_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelReservation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `roomId` INTEGER NOT NULL,
    `guestId` INTEGER NOT NULL,
    `checkIn` DATE NOT NULL,
    `checkOut` DATE NOT NULL,
    `adults` INTEGER NOT NULL DEFAULT 1,
    `children` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    `totalPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HotelReservation_companyId_idx`(`companyId`),
    INDEX `HotelReservation_roomId_checkIn_checkOut_idx`(`roomId`, `checkIn`, `checkOut`),
    INDEX `HotelReservation_guestId_idx`(`guestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelDocument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `guestId` INTEGER NULL,
    `reservationId` INTEGER NULL,
    `title` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'Autre',
    `fileUrl` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HotelDocument_companyId_idx`(`companyId`),
    INDEX `HotelDocument_guestId_idx`(`guestId`),
    INDEX `HotelDocument_reservationId_idx`(`reservationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HotelRoom` ADD CONSTRAINT `HotelRoom_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelGuest` ADD CONSTRAINT `HotelGuest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelReservation` ADD CONSTRAINT `HotelReservation_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelReservation` ADD CONSTRAINT `HotelReservation_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `HotelRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelReservation` ADD CONSTRAINT `HotelReservation_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `HotelGuest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelDocument` ADD CONSTRAINT `HotelDocument_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `HotelDocument` ADD CONSTRAINT `HotelDocument_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `HotelGuest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `HotelDocument` ADD CONSTRAINT `HotelDocument_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `HotelReservation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
