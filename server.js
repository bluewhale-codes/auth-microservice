const app = require("./index");
const {connectToDB} = require('./config/db');
const port = process.env.PORT;

connectToDB();
app.listen(port,()=>{
    console.log(`app is listening on port ${port}`);
})

