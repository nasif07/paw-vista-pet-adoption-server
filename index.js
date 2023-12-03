const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://paw-vista-server:J1RO48JZSCHXzguy@cluster0.q0knahp.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const petCollection = client.db("petCollectionDB").collection("allAvailablePets");
    const adoptionReqCollection = client.db("adoptionRequestDB").collection("allAdoptionRequest");
    const donationcollection = client.db("donationDB").collection("allDonation");
    const donarsCollection = client.db("donarsDB").collection("allDonars");
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "1h" });
      res.send({ token })
    })

    // middlewares
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
      })
      // next()
    }
    // console.log(process.env.ACCESS_TOKEN);


    // app pets api

    app.get("/allPets", async (req, res) => {
      const result = await petCollection.find().sort({ date: -1 }).toArray();
      res.send(result)
      // console.log(req.headers);
    });
    app.post("/allPets", async (req, res) => {
      const petInfo = req.body;
      const result = await petCollection.insertOne(petInfo);
      res.send(result);
    });
    app.get("/allPets/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      }
      const result = await petCollection.findOne(query);
      res.send(result);
    })


    app.post('/adoptionRequest', async (req, res) => {
      const requestInfo = req.body;
      const result = await adoptionReqCollection.insertOne(requestInfo);
      res.send(result);
    });



    // donation api


    app.get("/allDonation", async (req, res) => {
      const result = await donationcollection.find().sort({ createDate: -1 }).toArray();
      res.send(result)
      // console.log(req.headers);
    });
    app.get("/allDonation/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      }
      const result = await donationcollection.findOne(query);
      res.send(result);
    })
    app.get("/active", async (req, res) => {
      // const query = 
      const result = await donationcollection.find({ "active": "isActive" }).sort({ date: -1 }).toArray();
      res.send(result)
      // console.log(req.headers);
    });


    // donars api
    app.post("/allDonars", async(req, res) => {
      const donarsInfo = req.body;
      const result = await donarsCollection.insertOne(donarsInfo);
      res.send(result);
    })


    app.post('/create-payment-intent', async (req, res) => {
      const {donationAmount} = req.body;
      const amount = parseInt(donationAmount * 100);
      console.log(amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })





    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('bestro boss server is running!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

//   paw-vista-server
//   J1RO48JZSCHXzguy