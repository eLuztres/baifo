require('dotenv').config();
// Tests expect the regular shop; showcase suites switch it on themselves.
delete process.env.SHOWCASE_MODE;
