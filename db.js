const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'comsciproject.net',
    port: 3306,
    user: 'u528477660_blood',
    password: 'jfVklQ0S;W3',
    database: 'u528477660_blood',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection((err, connection) => {
    if (err) {
        console.log('MySQL Error:', err);
    } else {
        console.log('MySQL Connected');
        connection.release();
    }
});

module.exports = pool;