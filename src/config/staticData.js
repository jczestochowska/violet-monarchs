const { loadStaticData } = require('./loadStaticData');

// Loaded once at process boot; puzzle solutions & bingo answer key live only
// in this module-scoped object and are never imported by views/ or public/.
module.exports = loadStaticData();
