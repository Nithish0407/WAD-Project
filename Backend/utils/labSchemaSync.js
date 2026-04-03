// Legacy no-op shims: lab-level databases are removed in single-DB mode.
async function syncEquipmentToLabSchema() {
  return;
}

async function removeEquipmentFromLabSchema() {
  return;
}

module.exports = { syncEquipmentToLabSchema, removeEquipmentFromLabSchema };
