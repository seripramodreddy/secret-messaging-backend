const express=require("express");
const mongodb=require("mongodb");
const cors=require("cors");
const bcrypt=require("bcrypt");
const dotenv=require("dotenv");
const nodemailer=require("nodemailer");

const router=express();
router.use(express.json());
router.use(cors());
dotenv.config();

const mongoClient=mongodb.MongoClient;
const objectId=mongodb.ObjectID;
const port=process.env.PORT||3000;
const DB_URL=process.env.DB_URL;
const EMAIL=process.env.EMAIL;
const PASSWORD=process.env.PASSWORD;
const saltRounds=10;

const transporter=nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:EMAIL,
        pass:PASSWORD
    }
})

const mailData={
    from:EMAIL,
    subject:"SECRET M*SSAGE",
};

const mailMessage=(url)=>{
    return `<p>Hi <br/> You have secret message to open.<br/> <a href=${url} target='_blank'>${url}</a></p>`;
}

router.post("/create-message", async (req, res) => {
    try {
      const client = await mongoClient.connect(DB_URL);
      const db = client.db("secretMessage");
      const salt = bcrypt.genSaltSync(saltRounds);
      const hash = bcrypt.hashSync(req.body.password, salt);
  
      // message key password [ targetUrl targetMail ]
  
      const data = {
        key: req.body.randomKey,
        password: hash,
        message: req.body.message,
      };
  
      const result = await db.collection("secretMessage").insertOne(data);
      const messageId = result.ops[0]._id;
      const userMessageUrl = `${req.body.targetUrl}?rs=${messageId}`;
      mailData.to = req.body.targetMail;
      mailData.html = mailMessage(userMessageUrl);
      await transporter.sendMail(mailData);
  
      res.status(200).json({
        message:
          "secret message has been sent. don't forget your secret key and password",
      });
      client.close();
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  });
router.get("/message-by-id/:id", async (req, res) => {
    try {
      const client = await mongoClient.connect(DB_URL);
      const db = client.db("secretMessage");
      const result = await db
        .collection("secretMessage")
        .find({ _id: objectId(req.params.id) })
        .project({ password: 0, _id: 0, key: 0 })
        .toArray();
      res
        .status(200)
        .json({ message: "Message have been fetched successfully", result });
      client.close();
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  });
  
  router.delete("/delete-message", async (req, res) => {
    try {
      const client = await mongoClient.connect(DB_URL);
      const db = client.db("secretMessage");
      const secret = await db
        .collection("secretMessage")
        .findOne({ key: req.body.secretKey });
      if (secret) {
        const compare = bcrypt.compareSync(req.body.password, secret.password);
        if (compare) {
          // console.log(secret, compare);
          const rs = await db
            .collection("secretMessage")
            .findOneAndDelete({ key: req.body.secretKey });
          console.log(secret, compare, rs);
          res
            .status(200)
            .json({ message: "message has been deleted successfully" });
        } else {
          res.status(401).json({ message: "Password mismatch" });
        }
      } else {
        res.status(403).json({ message: "Not a valid user!" });
      }
      client.close();
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  });
router.listen(port,()=>console.log(`::Server is up and running::${port}`))