<template>
  <div id="app">
    <div class="header-container">
      <div class="header-item" v-for="table in tables" @click="selectedTable = table">{{ table.title }}</div>
    </div>
    <a :href="dataURI">StorageData</a>
    <template v-if="selectedTable">
      <report :cols="selectedTable.cols" :rows="selectedTable.rows"></report>
    </template>
  </div>
</template>

<script>
import report from "./report.vue";
import { getTables } from "./store";
import storage from "../base/storage"

export default {
  name: "app",
  components: {
    report,
  },
  data() {
    return {
      tables: getTables(),
      selectedTable: null,
      dataURI: `data:application/octet-stream,${encodeURIComponent(JSON.stringify(storage.export()))}`
    };
  },
};
</script>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
.header-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.header-item {
  flex: 1;
}
</style>
