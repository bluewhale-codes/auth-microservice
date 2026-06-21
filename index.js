const express = require("express");
// const passport = require("passport");
const cors = require('cors');
// const errorMiddleware = require("./middleware/errors")
const cookieParser = require("cookie-parser")
const dotenv = require("dotenv");




dotenv.config();

// require('./config/passport')



const app = express();
app.use(cookieParser());
app.use(express.json())
app.use(cors({
  origin: ["http://localhost:5173","https://devfolio-alpha-one.vercel.app","https://mock-mate-zeta-mauve.vercel.app"],
  // frontend URL,
  credentials: true
}));

// app.use(passport.initialize());

//user Routes
const userRoute = require("./Routes/userRoutes");

//Mock mate Routes
// const mockmateRoutes = require("./Routes/mockMateRoutes");

app.use("/api",userRoute);
// app.use("/mockmate",mockmateRoutes);





app.get("/greeting",(req,res)=>{
    res.send("Hello world");
})

app.use(errorMiddleware);
module.exports = app;