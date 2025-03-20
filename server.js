const express = require('express')
const bodyParser = require('body-parser')
const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const Cors= require('cors')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const { authenticateToken, isAdmin } = require('./middleware');
require('dotenv').config();

//database connection 
const db = mysql.createConnection({
	host:process.env.DB_HOST,
	user:process.env.DB_USER,
	password:process.env.DB_PASS,
	database:process.env.DB_NAME
})

const port = process.env.Port
const app = express()
app.use(Cors())
app.use(bodyParser.json())
 
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

//register routes
app.post('/register', async (req, res) => {
    const {user_name, password, email, address, role = 'user' } = req.body;
    // Check if user already exists
    const userExist = 'SELECT * FROM user WHERE email = ?';
    db.query(userExist, [email], (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).send('Database query failed');
        }
        if (results.length > 0) {
            return res.status(400).json('User already exists');
        }
    });
    // Hash password
    const HashedPassword = await bcrypt.hash(password, 2);
    const newUser = 'INSERT INTO user (user_name, password, email, address, role) VALUES (?, ?, ?, ?, ?)';
    db.query(newUser, [user_name, HashedPassword, email, address, role], (err, results) => {
        if (err) {
            console.error('Error creating the user:', err);
            return res.status(500).json({ error: 'Failed to create the new user in the database' });
        }
        res.status(201).json({ message: ' Account was successfully created', results });
    });
});


//login routes
app.post('/login',async(req,res)=>{
const {email,password} = req.body;

const userExist = 'SELECT * FROM user WHERE email = ?';
db.query(userExist,[email],async(err,results)=>{

	if(err){
		console.error('Error fetching data:',err);
		res.status(500).send('database query failed ');

	}
	if(results.length===0){
		return res.status(400).json('user does not exist please sing up')
	}
	const user = results[0]
	const validPassword = await bcrypt.compare(password,user.password)
	if(!validPassword){
		return res.status(400).json('password is incorrect')
	}	

	const token = jwt.sign({id:user.id,email:user.email},process.env.JWT_SECRET,{expiresIn:'1h'})
	res.json({token})
	
})

});
//admin route
app.get('/admin',authenticateToken,isAdmin,(req,res)=>{
    res.json('admin route')
})
// get products route
app.get('/products',(req,res)=>{
	const products = 'SELECT * FROM products';
	db.query(products,(err,results)=>{
		if(err){
			console.error('there was an error getting products:',err)
			res.status(400).send('error in getting products data')
		}else{
			res.json(results)
		}
	})
}); 


//get a peticuler product
app.get('/products/:id',(req,res)=>{
	const {id} = req.params
	const product = 'SELECT * FROM products WHERE id = ?';
	db.query(product,[id],(err,results)=>{
		if(err){
			console.error('there was an error',err)
			res.status(400).send('error in getting product data')
		}else{
			res.json(results)
		}
	})
});

//create a product.
app.post('/products',authenticateToken, isAdmin ,async (req,res)=>{
const {price,discription,id} = req.body;
const image_url = req.file.path;
const newProduct = 'INSERT INTO products(image_url,price,discription,id) VALUES(?,?,?,?)';
db.query(newProduct,[image_url,price,discription,id],(err,results)=>{
	if(err){
		console.error('there was an error',err)
		res.status(400).send('error in creating products data')
	}else{
		res.json(results)
	}
});
});

//update a product
app.put('/products/:id',authenticateToken, isAdmin ,(req,res)=>{
	const {id}= req.params;
	const updateProduct = req.body
	const query = 'UPDATE products SET ? WHERE id = ?';
	db.query(query,[updateProduct,id],(err,results)=>{
		if(err){
			console.error('there was an error',err)
			res.status(400).send('error in updating products data')
		}else{
			res.json(results)
		}
	})
});
//delete a product 
app.delete('/products/:id',authenticateToken, isAdmin ,(req,res)=>{
	const {id} = req.params;
	const DeleteProduct = 'DELETE FROM products WHERE id = ?';
	db.query(DeleteProduct,[id],(err,results)=>{
		if(err){
			console.error('there was an error',err)
			res.status(400).send('error in deleting products data')
		}else{
			res.json("product was sucessfuly removed")
		}
	})
});


// Create a new order
app.post('/orders', (req, res) => {
    const { user_id, product_id, quantity, total_price } = req.body;

    const newOrder = 'INSERT INTO orders (user_id, product_id, quantity, total_price) VALUES (?, ?, ?, ?)';
    db.query(newOrder, [user_id, product_id, quantity, total_price], (err, results) => {
        if (err) {
            console.error('Error creating the order:', err);
            return res.status(500).json({ error: 'Failed to create the new order in the database' });
        }
        res.status(201).json({ message: 'Order created successfully', results });
    });
});

// Get all orders
app.get('/orders', (req, res) => {
    const query = 'SELECT * FROM orders';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching orders data:', err);
            return res.status(500).send('Error in getting orders data');
        }
        res.json(results);
    });
});
// Get a particular order
app.get('/orders/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM orders WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error fetching order data:', err);
            return res.status(400).send('Error in getting order data');
        }
        res.json(results);
    });
});

// Update an order
app.put('/orders/:id', (req, res) => {
    const { id } = req.params;
    const updateOrder = req.body;
    const query = 'UPDATE orders SET ? WHERE id = ?';
    db.query(query, [updateOrder, id], (err, results) => {
        if (err) {
            console.error('Error updating the order:', err);
            return res.status(500).send('Error in updating order data');
        }
        res.json(results);
    });
});

// Delete an order
app.delete('/orders/:id', (req, res) => {
    const { id } = req.params;
    const deleteOrder = 'DELETE FROM orders WHERE id = ?';
    db.query(deleteOrder, [id], (err, results) => {
        if (err) {
            console.error('Error deleting the order:', err);
            return res.status(500).send('Error in deleting order data');
        }
        res.json("Order was successfully removed");
    });
});

app.listen(port,'localhost',()=>{console.log(`server runing in port: ${port}`)})