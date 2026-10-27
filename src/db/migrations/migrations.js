// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_lovely_celestials.sql';
import m0001 from './0001_serious_purple_man.sql';
import m0002 from './0002_regular_the_anarchist.sql';
import m0003 from './0003_pink_warbound.sql';
import m0004 from './0004_complex_mariko_yashida.sql';
import m0005 from './0005_damp_the_captain.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005
    }
  }
  