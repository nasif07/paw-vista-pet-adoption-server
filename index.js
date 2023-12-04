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
    const usersCollection = client.db("usersDB").collection("allUsers");
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

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }


   
    // user related api

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      else {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      }
    });

    app.get('/users', verifyToken, async (req, res) => {
      // console.log('ami', req.headers);
      const result = await usersCollection.find().toArray();
      res.send(result)
    })


    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'unauthorized access' })
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin })
    })
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

     // app pets api

    app.get("/allPets", async (req, res) => {
      const email = req.query.email;
      if (email) {
        const query = { email: email }
        const result = await petCollection.find(query).sort({ date: -1 }).toArray();
        return res.send(result)
      }
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

    app.delete('/allPets/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.deleteOne(query);
      res.send(result);
    });


    app.put("/allPets/:id", verifyToken,  async (req, res) => {
      const id = req.params.id;
      const data = req.body;


      const filter = {
          _id: new ObjectId(id)
      };
      const options = { upsert: true };
      const updatedData = {
          $set: {
              image: data.image,
              name: data.name,
              category: data.category,
              location: data.location,
              shortDescription: data.shortDescription,
              longDescription: data.longDescription,
              age: data.age
          }
      };
      const result = await petCollection.updateOne(filter, updatedData, options);
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
    app.post("/allDonars", async (req, res) => {
      const donarsInfo = req.body;
      const result = await donarsCollection.insertOne(donarsInfo);
      res.send(result);
    })


    app.post('/create-payment-intent', async (req, res) => {
      const { donationAmount } = req.body;
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





    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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