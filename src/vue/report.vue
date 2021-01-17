<template>
  <div>
    <table class="report-table">
      <thead>
        <tr>
          <th v-for="title in getTitles()" class="report-th">{{ title }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows">
          <td v-for="val in getValuesForRow(row)" class="report-td">
            <span v-html="val"></span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  props: ["cols", "rows"],
  data() {
    return {};
  },
  methods: {
    getTitles() {
      return this.cols.map((col) => col.title);
    },
    getValuesForRow(row) {
      return this.cols.map((col) => row[col.field]);
    },
  },
};
</script>

<style>
.report-table {
  display: block;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  border-collapse: collapse;
  letter-spacing: 1px;
  /* font-size: 0.5rem; */
}

.report-td,
.report-th {
  padding: 5px 10px;
}

.report-td {
  text-align: center;
}

.report-th {
  background-color: rgb(235, 235, 235);
}

tr:nth-child(even) .report-td {
  background-color: rgb(250, 250, 250);
}

tr:nth-child(odd) .report-td {
  background-color: rgb(245, 245, 245);
}
</style>
