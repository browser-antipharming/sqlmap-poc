
const express = require('express')
var bodyParser = require('body-parser')
const sqlite3 = require('sqlite3').verbose();
const app = express()
const port = 3000

app.use(bodyParser.urlencoded({ extended: false }))

const db = new sqlite3.Database('./my_data.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the SQlite database.');
});

app.post('/authenticate/:username', (req, res) => {
    const query = `
    SELECT 
        username, 
        password 
    FROM 
        users 
    WHERE 
        username='${req.params.username}'
        AND
        password='${req.body.password}'
    `;
    db.get(query, 
        (err, row)=>{
            console.log(query)
            console.log(err)
            console.log(row)
            if (!row) {
                res.send('Invalid login');
            } else {
                res.send(row);
            }
            return row;
        }
    );
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
