const app = require("./index");
const {connectToDB} = require('./config/db');
const port = process.env.PORT || 5000;

// connectToDB();
// app.listen(port,()=>{
//     console.log(`app is listening on port ${port}`);
// })


const startServer = async () => {
  try {
    await connectToDB();

    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

