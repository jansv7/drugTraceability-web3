// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DrugTypes.sol";
import "./DrugAccessControl.sol";

/// @title DrugTraceability
/// @notice Kontrak inti pelacakan alur distribusi obat dan penanganan recall.
/// @dev Struktur file mengikuti lampiran laporan UTS: DrugTypes.sol,
///      DrugAccessControl.sol, dan DrugTraceability.sol.
contract DrugTraceability is DrugAccessControl {

    // batchId (bytes32) => Batch
    mapping(bytes32 => DrugTypes.Batch) public batches;

    // batchId (bytes32) => Riwayat perpindahan
    mapping(bytes32 => DrugTypes.TransferRecord[]) public transferHistory;

    event BatchRegistered(bytes32 indexed batchId, string nie, string batchCode, address indexed manufacturer);
    event CustodyTransferred(bytes32 indexed batchId, address indexed from, address indexed to, uint256 timestamp);
    event BatchRecalled(bytes32 indexed batchId, string reason);

    // ---------------------------------------------------------------------
    // 1. Registrasi Batch Obat (Pabrik)
    // ---------------------------------------------------------------------
    function registerBatch(
        string calldata _nie,
        string calldata _batchCode,
        uint256 _manufactureDate,
        uint256 _expiryDate,
        string calldata _serialNumber
    ) external onlyRole(DrugTypes.Role.Manufacturer) returns (bytes32 batchId) {
        require(_expiryDate > _manufactureDate, "Tanggal kedaluwarsa harus setelah tanggal produksi");

        batchId = computeBatchId(_nie, _batchCode, _serialNumber);
        require(!batches[batchId].exists, "Batch dengan kombinasi NIE/kode batch/serial ini sudah terdaftar");

        batches[batchId] = DrugTypes.Batch({
            nie: _nie,
            batchCode: _batchCode,
            manufactureDate: _manufactureDate,
            expiryDate: _expiryDate,
            serialNumber: _serialNumber,
            manufacturer: msg.sender,
            currentHolder: msg.sender,
            recalled: false,
            recallReason: "",
            exists: true
        });

        emit BatchRegistered(batchId, _nie, _batchCode, msg.sender);
    }

    /// @notice Membentuk identitas batch unik dari keccak256(NIE + batchCode + serialNumber)
    function computeBatchId(
        string calldata _nie,
        string calldata _batchCode,
        string calldata _serialNumber
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_nie, _batchCode, _serialNumber));
    }

    // ---------------------------------------------------------------------
    // 2. Perpindahan Kepemilikan (Transfer Custody)
    // ---------------------------------------------------------------------
    function transferCustody(bytes32 _batchId, address _to) external {
        DrugTypes.Batch storage b = batches[_batchId];
        require(b.exists, "Batch tidak ditemukan");
        require(!b.recalled, "Batch berstatus recall, tidak dapat dipindahtangankan");
        require(b.currentHolder == msg.sender, "Anda bukan pemegang batch saat ini");
        require(roles[_to] != DrugTypes.Role.None, "Penerima belum terdaftar sebagai aktor rantai pasok");

        transferHistory[_batchId].push(DrugTypes.TransferRecord({
            from: msg.sender,
            to: _to,
            timestamp: block.timestamp
        }));

        b.currentHolder = _to;
        emit CustodyTransferred(_batchId, msg.sender, _to, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // 3. Verifikasi Keaslian & Riwayat Distribusi
    // ---------------------------------------------------------------------
    function verifyAuthenticity(bytes32 _batchId) external view returns (
        bool    isAuthentic,
        string  memory nie,
        string  memory batchCode,
        uint256 expiryDate,
        address currentHolder,
        bool    recalled,
        uint256 totalPerpindahan
    ) {
        DrugTypes.Batch storage b = batches[_batchId];
        isAuthentic       = b.exists;
        nie               = b.nie;
        batchCode         = b.batchCode;
        expiryDate        = b.expiryDate;
        currentHolder     = b.currentHolder;
        recalled          = b.recalled;
        totalPerpindahan  = transferHistory[_batchId].length;
    }

    function getTransferHistory(bytes32 _batchId) external view returns (DrugTypes.TransferRecord[] memory) {
        return transferHistory[_batchId];
    }

    // ---------------------------------------------------------------------
    // 4. Penanganan Recall (BPOM / Pabrik)
    // ---------------------------------------------------------------------
    function flagRecall(bytes32 _batchId, string calldata _reason) external {
        require(
            msg.sender == regulator || roles[msg.sender] == DrugTypes.Role.Manufacturer,
            "Hanya BPOM atau pabrik yang dapat memicu recall"
        );
        DrugTypes.Batch storage b = batches[_batchId];
        require(b.exists, "Batch tidak ditemukan");
        require(!b.recalled, "Batch sudah berstatus recall sebelumnya");

        b.recalled = true;
        b.recallReason = _reason;
        emit BatchRecalled(_batchId, _reason);
    }
}
