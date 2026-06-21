const app = require("./index");
const DBconnection = require('./db');
const port = process.env.PORT;

DBconnection();
app.listen(port,()=>{
    console.log(`app is listening on port ${port}`);
})

