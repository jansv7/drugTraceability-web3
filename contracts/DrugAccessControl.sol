// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DrugTypes.sol";

/// @title DrugAccessControl
/// @notice Mengatur role-based access control untuk rantai pasok farmasi.
contract DrugAccessControl {
    address public regulator;
    mapping(address => DrugTypes.Role) public roles;

    event ActorRegistered(address indexed actor, DrugTypes.Role role);

    modifier onlyRole(DrugTypes.Role _role) {
        require(roles[msg.sender] == _role, "Peran pemanggil tidak sesuai");
        _;
    }

    modifier onlyRegulator() {
        require(msg.sender == regulator, "Hanya BPOM (regulator) yang berwenang");
        _;
    }

    constructor() {
        regulator = msg.sender;
        roles[msg.sender] = DrugTypes.Role.Regulator;
        emit ActorRegistered(msg.sender, DrugTypes.Role.Regulator);
    }

    /// @notice BPOM mendaftarkan alamat wallet pihak yang terlibat dalam distribusi obat
    function registerActor(address _actor, DrugTypes.Role _role) external onlyRegulator {
        require(_role != DrugTypes.Role.None, "Peran tidak valid");
        roles[_actor] = _role;
        emit ActorRegistered(_actor, _role);
    }
}
