// Types for the migrations bundle drizzle-kit generates next to this file.
declare const migrations: {
  journal: {
    entries: { idx: number; when: number; tag: string; breakpoints: boolean }[];
  };
  migrations: Record<string, string>;
};
export default migrations;
