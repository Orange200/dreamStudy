import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
const config=await readFile(new URL('../.runtime/admin.env',import.meta.url),'utf8');
const password=config.match(/^MYSQL_ROOT_PASSWORD=(.+)$/m)?.[1].trim();
if(!password)throw new Error('Local administrator credentials missing');
const connection=await mysql.createConnection({host:'127.0.0.1',port:3307,user:'root',password});
await connection.query('SHUTDOWN');
await connection.end();
console.log('MySQL shut down gracefully.');
