import express, {json, urlencoded} from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import userrouter from "./routes/user.js";


const PORT=5000;
const app=express();
app.use(express.json());
app.use(cors());
app.use(urlencoded({ extended: true }));

dotenv.config();
mongoose.connect(process.env.MONGO_URI || '',{dbName: 'TriFocus'}).then(()=>{
    console.log('connected to mongodb');
})
.catch((err)=>{
    console.log(err);
})

app.listen(PORT,()=> {
    console.log(`Server is running on port ${PORT}`);
    
})

app.get("/ping", (_req, res) => {
    return res.json({ msg: "Ping Successful" });
  });
app.use("/api/user", userrouter);


export default app