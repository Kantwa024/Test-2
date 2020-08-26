const express = require('express');
const multer = require('multer');
const ejs = require('ejs');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodoverride = require('method-override');
const bodyparser = require('body-parser');
require('dotenv').config();


const app = express();
app.set("view engine","ejs");
app.use(express.static("./public"));
app.use(bodyparser.json());
app.use(methodoverride('_method'));



const mongoUri = process.env.DB_URI;
mongoose.connect(mongoUri,{useUnifiedTopology:true,useNewUrlParser:true});
const conn = mongoose.connection;

let gfs;
conn.once('open',()=>{
    gfs = Grid(conn.db,mongoose.mongo);
    gfs.collection("uploads");
    console.log("connect");
});

const storage = new GridFsStorage({
    url: mongoUri,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });

const upload = multer({ storage });

const port = process.env.PORT || 3000;

app.listen(port,(err)=>{
    if(err){
        console.log(err);
    }else{
        console.log("ready");
    }
});


app.get("/",(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length === 0){
            res.render("index",{files:false});
        }else{
            files.map(file =>{
                if(file.contentType === "image/jpeg" || file.contentType === "image/png")
                {
                    file.isImage = true;
                }
                else{
                    file.isImage = false;
                }
            });
            res.render("index",{files:files});
        }
    })
});

app.post("/upload",upload.single('myFile'),(req,res)=>{
    console.log(req.body);
});

app.get("/files",(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(err){
            return res.log("<h1>404 Error<h1>");
        }
        else{
            return res.json({files:files});
        }
    });
});

app.get("/image/:id",(req,res)=>{
    gfs.files.findOne({filename: req.params.id},(err,file)=>{
        if(err){
            return res.log("<h1>404 Error<h1>");
        }
        else{
            var readstream = gfs.createReadStream(file);
            readstream.pipe(res);
        }
    })
});


app.delete("/files/:id",(req,res)=>{

    gfs.remove({_id:req.params.id,root: "uploads"}, function (err, gridStore) {
        if (err){
            console.log("error");
        }else{
            console.log('success');
            res.redirect("/");
        }
      });
});