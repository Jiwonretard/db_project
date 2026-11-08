import 'dotenv/config';
import mysql from 'mysql2/promise';
import { connectDb } from './db.js';

function readPassword() {
  if (!process.stdin.isTTY) throw new Error('터미널에서 npm run db:setup을 실행해주세요.');
  return new Promise((resolve, reject) => {
    process.stdout.write('MySQL root 관리자 비밀번호 (입력 내용은 표시되지 않음): ');
    let value = '';
    const done = () => {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    function onData(data) {
      for (const char of data) {
        if (char === '\r' || char === '\n') { done(); resolve(value); return; }
        if (char === '\u0003') { done(); reject(new Error('취소했습니다.')); return; }
        if (char === '\u007f' || char === '\b') value = Array.from(value).slice(0,-1).join('');
        else if (char >= ' ') value += char;
      }
    }
    process.stdin.setEncoding('utf8');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

const name = process.env.DB_NAME;
const username = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const host = process.env.DB_HOST || '127.0.0.1';
let admin;
try {
  if (!name || !/^[a-zA-Z0-9_]+$/.test(name)) throw new Error('.env의 DB_NAME을 확인해주세요.');
  if (username !== '20618') throw new Error('이 설정 명령은 요청한 20618 계정 전용입니다.');
  if (!password) throw new Error('.env의 DB_PASSWORD가 비어 있습니다.');
  if (!['localhost','127.0.0.1','::1'].includes(host)) throw new Error('이 설정 명령은 로컬 MySQL 전용입니다.');
  console.log('20618 계정을 생성하고 지정된 DB에 필요한 권한과 테이블을 준비합니다.');
  console.log('기존 계정 비밀번호와 기존 데이터는 변경하지 않습니다.');
  const adminPassword = await readPassword();
  admin = await mysql.createConnection({host,port:Number(process.env.DB_PORT || 3306),user:'root',password:adminPassword,connectTimeout:8000});
  const [existing] = await admin.execute("SELECT User FROM mysql.user WHERE User=? AND Host='localhost'",[username]);
  if (existing.length) {
    // Existing credentials are verified, never silently reset.
    let probe;
    try { probe = await mysql.createConnection({host,port:Number(process.env.DB_PORT || 3306),user:username,password,connectTimeout:8000}); }
    catch { throw new Error('20618 계정이 이미 있습니다. .env의 DB_PASSWORD를 기존 계정 비밀번호로 맞춰주세요.'); }
    finally { if(probe) await probe.end(); }
  }
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  if(!existing.length) await admin.query(`CREATE USER ${admin.escape(username)}@'localhost' IDENTIFIED BY ${admin.escape(password)}`);
  await admin.query(`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, REFERENCES ON \`${name}\`.* TO ${admin.escape(username)}@'localhost'`);
  await admin.end(); admin = null;
  const db = await connectDb({client:'mysql'});
  try { await db.one('SELECT 1 AS ok'); } finally { await db.close(); }
  console.log('완료: 20618 계정, DB 권한, users/posts/sessions 테이블, MySQL 연결 확인.');
  console.log('npm run dev로 실행하세요.');
} catch(error) {
  if(error.code==='ER_ACCESS_DENIED_ERROR') console.error('관리자 인증 실패: MySQL root 비밀번호를 확인해주세요. 맥 로그인 비밀번호와 다를 수 있습니다.');
  else if(error.code==='ECONNREFUSED') console.error('MySQL 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해주세요.');
  else if(error.code) console.error('설정 실패:',error.code,'— 생성된 항목이 있을 수 있습니다. 기존 데이터를 삭제하지 말고 설정을 확인해주세요.');
  else console.error(error.message);
  process.exitCode=1;
} finally { if(admin) await admin.end(); }
