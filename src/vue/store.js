
function getStore() {
    return {
        tables: [],
        addTable(table) {
            this.tables.push(table);
        },
    };
}

function getTables() {
    if (!window.ttStore) {
        window.ttStore = getStore();
    }
    return window.ttStore.tables;
}

function addTable(table) {
    if (!window.ttStore) {
        window.ttStore = getStore();
    }
    window.ttStore.addTable(table);
}

module.exports = { getTables, addTable };
