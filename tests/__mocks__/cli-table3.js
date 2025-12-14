// Mock cli-table3 for Jest
class Table {
  constructor(options = {}) {
    this.head = options.head || [];
    this.rows = [];
  }

  push(...rows) {
    this.rows.push(...rows);
  }

  toString() {
    const headerRow = this.head.length > 0 ? `| ${this.head.join(' | ')} |\n` : '';
    const bodyRows = this.rows.map(row => {
      if (Array.isArray(row)) {
        return `| ${row.join(' | ')} |`;
      } else if (row.colSpan) {
        return `| ${row.content} |`;
      }
      return `| ${Object.values(row).join(' | ')} |`;
    }).join('\n');
    return headerRow + bodyRows;
  }
}

module.exports = Table;
module.exports.default = Table;
