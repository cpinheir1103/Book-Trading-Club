var express = require('express');
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var app = express();


/////// FOR SQLITE3   ////////
var sqlite3 = require("sqlite3").verbose();
var fs = require("fs");
var file = "new.db"; 
var exists = fs.existsSync(file);
console.log("exists=" + exists);
var db = new sqlite3.Database(file);
console.log("db=" + db);
//////// FOR EJS //////////
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
//////////////////////////



////// DATABASE /////////////////////////////////////////////////////////
if (false) {
  db.serialize(function() {
    //db.run("DROP TABLE events");
    //db.run("DROP TABLE users");
    //console.log("DROPPING TABLE!");
    //db.run("CREATE TABLE books ( ID	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, picURL TEXT, owner INTEGER)");
    //db.run("CREATE TABLE requests ( ID	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, bookID INTEGER, reqBy INTEGER, approved INTEGER)");
    //db.run("CREATE TABLE users ( ID	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, username TEXT, password TEXT, email TEXT, name TEXT, city TEXT, state TEXT)");  
    //console.log("CREATING TABLE!");
  });
}

if (false) {
  db.each("select name from sqlite_master where type='table'", function (err, table) {
          console.log(table);
  });
}

function procRegister(rb) {
  db.serialize(function() {
    var stmt = db.prepare("INSERT INTO users(username, password, city, name, email, state) VALUES(?,?,?,?,?,?)");
    stmt.run(rb.username, rb.password, rb.city, rb.name, rb.email, rb.state);  
    stmt.finalize();
  });
   
  showTable("users");
}

function procLogin(req, res) {
  //console.log("req.body.username=" + req.body.username); 
  //console.log("req.body.password=" + req.body.password); 
  db.each("SELECT * FROM users where username = '" + req.body.username + "' and password = '" + req.body.password + "'", 
    function(err, row) { 
      //console.log("row.username=" + row.username); 
      req.session.authuser = row.username;
      req.session.authcity = row.city;
    },
      function complete(err, found) {
        //res.status(500).send({error: 'you have an error'}); 
        if (req.session.authuser === undefined) {
          res.writeHead(500, {"Content-Type": "application/json"});
          res.end();
        }
        else  
        {
          //res.writeHead(200, {"Content-Type": "application/json"});
          res.end('{"success" : "Updated Successfully", "status" : 200}');
        }
        
  });
  
}

function newEventRec(req, res) {
  console.log("newEventRec");
  db.serialize(function() {
    var stmt = db.prepare("INSERT INTO events(name, owner) VALUES(?,?)");
    stmt.run(req.body.title, req.session.authuser);
    stmt.finalize();
  });
  
  showTable("events");
}

function delEventRec(req, res) {
  console.log("delEventRec");
  db.serialize(function() {
    var stmt = db.prepare("DELETE FROM events where name='" + req.body.title + "' and owner='" + req.session.authuser + "'");
    stmt.run();
    stmt.finalize();
  });
  
  showTable("events");
}

function procNewBook(req, res) {  
  console.log("newEventRec");
  db.serialize(function() {
    var stmt = db.prepare("INSERT INTO books(picURL, owner) VALUES(?,?)");
    stmt.run(req.body.picURL, req.session.authuser);
    stmt.finalize();
  });
  
  showTable("books");  
}

function showTable(tbl) {
  db.serialize(function(url) {
    db.each("SELECT * FROM " + tbl, function(err, row) {
      console.log(row);
    });
  });
}

function getAllBookRecs(req, res) {
  var retArr = [];
  console.log("in getAllBookRecs ()");
  db.each("SELECT * FROM books", function(err, row) { 
      retArr.push({ "ID": row.ID, "picURL": row.picURL, "owner": row.owner  });
      console.log(row.ID + ": " + row.picURL);
    },
      function complete(err, found) {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(retArr)); 
        res.end();
  });
}

function getMyBookRecs(req, res) {
  var retArr = [];
  console.log("in getAllBookRecs ()");
  db.each("SELECT * FROM books where owner = '" + req.session.authuser + "'", function(err, row) { 
      retArr.push({ "ID": row.ID, "picURL": row.picURL, "owner": row.owner  });
      console.log(row.ID + ": " + row.picURL);
    },
      function complete(err, found) {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(retArr)); 
        res.end();
  });
}

////// ROUTING ///////////////////////////////////////////////////////////////////

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(expressSession({secret: 'viush78474hffhs4'}));

app.get("/", function (req, res) {
  //req.session.authuser = undefined;          // temporarily hardcode no logged in user. 
  //req.session.authuser = "cpinheir";  // temporarily hardcode a logged in user. 
  console.log("index req.session.authuser=" + req.session.authuser);
  
  //res.redirect('/listpolls');
  
  res.render('index', {   
        authuser: req.session.authuser
      });
});

app.get("/index", function (req, res) {
  res.redirect('/');
});

app.get('/mybooks', function(req, res) {
   if (req.session.authuser === undefined) {
     res.render('/', {   
       authuser: req.session.authuser
     });
   }
   else {
      res.render('mybooks', {   
        authuser: req.session.authuser
      });
   }
  
  //res.sendFile(__dirname + '/views/newpoll.html');
});


app.get('/getMyBooks', function(req, res) {
  getMyBookRecs(req, res);
});

app.get('/getAllBooks', function(req, res) {
  getAllBookRecs(req, res);
});


app.post('/newbook', function(req,res){
    console.log(req.body);
    console.log("picURL=" + req.body.picURL);
    procNewBook(req, res);    
});

app.post('/procregister', function(req,res){
    console.log(req.body);
    console.log("username=" + req.body.username);
    procRegister(req.body);    
    res.end('{"success" : "Updated Successfully", "status" : 200}');
});

app.post('/proclogin', function(req,res){
    console.log(req.body);
    console.log("username=" + req.body.username);
    procLogin(req, res);    
});


app.get('/register', function(req, res) { 
  res.render('register', {   
    authuser: req.session.authuser
  });
})

app.get('/login', function(req, res) { 
  res.render('login', {   
    authuser: req.session.authuser
  });
})

app.get('/logout', function(req, res) {
  req.session.authuser = undefined;
  req.session.authcity = undefined;
  
  res.render('index', {   
    authuser: req.session.authuser,
    authcity: req.session.authcity
  });
})

app.get('/test', function(req, res) {
    console.log('GET:....slow url is responding');
    var retObj = { "test" : "cool" };
    //res.write(retObj);
    res.send(retObj);
    //res.sendStatus(200);

})

app.get('/testEJS', function(req, res) {
  res.render('testEJS', {   
    title: "EJS example",
    supplies: [ "fork", "knife", "spoon"]
  });
});

// listen for requests :)
app.listen(8080);