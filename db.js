const mongoose = require("mongoose");

const dbURL =process.env.DB_URL;

const connectToDB = () =>{
     mongoose.connect(dbURL)
     .then(()=>{
        console.log("Connection to Database Successfully");
     })
     .catch((err)=>{
        console.error("Connection fails"+err);
     })
}

module.exports = connectToDB;