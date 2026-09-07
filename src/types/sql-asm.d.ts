declare module "sql.js/dist/sql-asm.js" {
  import type initSqlJs from "sql.js";
  const initAsm: typeof initSqlJs;
  export default initAsm;
}
