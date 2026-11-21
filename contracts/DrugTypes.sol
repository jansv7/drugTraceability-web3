// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title DrugTypes
/// @notice Menampung enum dan struct utama untuk sistem pelacakan obat.
library DrugTypes {
    // Definisi peran aktor dalam sistem
    enum Role { None, Manufacturer, Distributor, Pharmacy, Regulator }

    // Struktur data atribut legalitas dan identitas batch obat
    struct Batch {
        string  nie;            // nomor izin edar BPOM
        string  batchCode;      // nomor batch pabrik
        uint256 manufactureDate; // unix timestamp
        uint256 expiryDate;      // unix timestamp
        string  serialNumber;
        address manufacturer;
        address currentHolder;
        bool    recalled;
        string  recallReason;
        bool    exists;
    }

    // Struktur data catatan jejak perpindahan fisik obat
    struct TransferRecord {
        address from;
        address to;
        uint256 timestamp;
    }
}
