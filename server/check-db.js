import 'dotenv/config';
import mysql from 'mysql2/promise';
let conn;
try {
 conn=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectTimeout:8000});
 const [tables]=await conn.query('SHOW TABLES');
 const names=tables.flatMap(row=>Object.values(row));
 for(const name of ['users','posts','sessions'])if(!names.includes(name))throw new Error(`${name} 테이블이 없습니다. npm run db:setup을 실행해주세요.`);
 await conn.query('SELECT p.id, u.nickname FROM posts p JOIN users u ON p.user_id=u.id LIMIT 1');
 console.log('MySQL 연결, 필수 테이블 3개, 회원–게시글 JOIN 확인 완료');
} catch(error) {
 console.error(error.code==='ER_ACCESS_DENIED_ERROR'?'MySQL 인증 실패. 최초 설정은 npm run db:setup을 실행하세요.':error.code==='ER_BAD_DB_ERROR'?'데이터베이스가 없습니다. npm run db:setup을 실행하세요.':error.code||error.message);
 process.exitCode=1;
} finally {if(conn)await conn.end();}
