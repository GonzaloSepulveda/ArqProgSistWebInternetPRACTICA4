// @author: Raul Garcia
import { MongoClient, ObjectId } from 'mongodb';
import { CartsModel, OrdersModel, ProductsModel, UsersModel } from "./types.ts";
import { fromCartToOrder, fromModeltoCart, fromModeltoOrder, fromModeltoProduct, fromModeltoProductWithoutDescription, getCartFormated } from "./utils.ts";
const MONGO_URL = Deno.env.get("MONGO_URL");

if(!MONGO_URL){
  console.error("Mongo URL not found")
  Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();

const db = client.db("Practica4");
const usersCollection = db.collection<UsersModel>("users");
const productsCollection = db.collection<ProductsModel>("products");
const cartsCollection = db.collection<CartsModel>("carts");
const ordersCollection = db.collection<OrdersModel>("orders");

const handler = async (req: Request): Promise<Response> =>{
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;

  if(method === "GET"){
    if(path === "/users"){
      const usersDB = await usersCollection.find().toArray();
      const users = usersDB.map((u)=>{
        return{
          id: u._id!.toString(),
          name: u.name,
          email: u.email,
        }
      })
      return new Response(JSON.stringify(users), {status: 200});
    }else if(path === "/products"){
      const productsDB = await productsCollection.find().toArray();
      const products = productsDB.map((u)=> fromModeltoProduct(u));
      const productsWithoutDescription = products.map((u)=> {
        if(u.description === null){
          return fromModeltoProductWithoutDescription(u)}
        else{ 
          return u; 
        }})
      return new Response(JSON.stringify(productsWithoutDescription), {status: 200});
    }else if(path === "/carts"){
      const userId = url.searchParams.get("userId");
      if(!userId){
        return new Response("userId is missing.", {status:400});
      }
      if(userId.length !== 24){
        return new Response("Id doesnt met length requirements.", {status:400});
      }
      const usersDB = await cartsCollection.findOne({userId :new ObjectId(userId)});
      if(!usersDB){
        return new Response("user not found.", {status:400});
      }
      const user = await getCartFormated(fromModeltoCart(usersDB), productsCollection);     
      return new Response(JSON.stringify(user), {status: 200});

    }else if(path === "/orders"){
      const userId = url.searchParams.get("userId");
      if(!userId){ return new Response("userId is missing.", {status:400}); }
      if(userId.length !== 24){ return new Response("userId doesnt meet length requirements.", {status:400}); }
      const ordersDB = await ordersCollection.find({userId: new ObjectId(userId)}).toArray();
      if(!ordersDB){ return new Response("User doesnt have orders.", {status:400});}
      const orders = ordersDB.map((u)=> fromModeltoOrder(u));
      return new Response(JSON.stringify(orders),{status:200});
    }
  }else if(method === "POST"){
    if(path === "/users"){
      const payload = await req.json();
      if(!payload.name || !payload.email || !payload.password){
        return new Response("Name, email and password are mandatory fields.", {status:400});
      }
      const email = await usersCollection.findOne({email:payload.email});
      if(email){
        return new Response("Email already in use.", {status:400});
      }
      const { insertedId } = await usersCollection.insertOne({
        name: payload.name,
        email: payload.email,
        password: payload.password,
      });
      return new Response(JSON.stringify({
        id: insertedId,
        name: payload.name,
        email: payload.email,
      }),{status:201});
    }else if(path === "/products"){
      const payload = await req.json();
      if(!payload.name || !payload.price || !payload.stock){
        return new Response("Name, price and stock are mandatory fields.", {status:400});
      }
      const { insertedId } = await productsCollection.insertOne({
        name: payload.name,
        description: payload.description,
        price: payload.price,
        stock: payload.stock,
      });

      if(payload.description){
        return new Response(
          JSON.stringify({
            id: insertedId,
            name: payload.name,
            description: payload.description,
            price: payload.price,
            stock: payload.stock,
          }),{status:201});
      }else{
        return new Response(JSON.stringify({
            id: insertedId,
            name: payload.name,
            price: payload.price,
            stock: payload.stock,
          }),{status:201});
      }
    }else if(path === "/carts/products"){
      const userId = url.searchParams.get("userId");
      const payload = await req.json();
      if(!userId){
        return new Response("userId is missing.", {status:400});
      }
      if(userId.length !== 24){
        return new Response("userId doesnt meet length requirements.", {status:400});
      }
      if(!payload.productId || !payload.quantity){
        return new Response("productId and quantity is needed.", {status:400});
      }
      if(payload.productId.length !== 24){
        return new Response("productId doesnt meet length requirements.", {status:400});
      }
      const product = await productsCollection.findOne({_id: new ObjectId(payload.productId)});
      if(!product){
        return new Response("product doesnt exist.", {status:400});
      }
      const cart = await cartsCollection.findOne({userId: new ObjectId(userId)});
      if(!cart){ //Crear carrito si el usuario no tiene uno
        await cartsCollection.insertOne({
          userId : new ObjectId(userId),
          products : [],
        });
      }
      if(payload.quantity > product.stock){
        return new Response("Quantity greater than stock",{status:400});
      }
      //Existe ya el producto en el carrito?
      const existingProduct = cart!.products.find((u)=> u.productId.equals(new ObjectId(payload.productId)));
      if(!existingProduct){
        cart!.products.push({ productId :new ObjectId(payload.productId), quantity: payload.quantity });
        await cartsCollection.updateOne({userId: new ObjectId(userId)},{$set: { products: cart!.products}});
      }else{
        const productosFinales = cart!.products.map((u)=> {if(u.productId.equals(new ObjectId(payload.productId))){
          return{
            productId : u.productId,
            quantity :u.quantity + payload.quantity,
          }}else{
            return{
              productId : u.productId,
              quantity : u.quantity,
            }}})
          await cartsCollection.updateOne({userId: new ObjectId(userId)},{$set: { products: productosFinales}});
      }   
      const carritoDB = await cartsCollection.findOne({userId :new ObjectId(userId)});
      const carrito = await getCartFormated(fromModeltoCart(carritoDB!), productsCollection);     
      return new Response(JSON.stringify(carrito), {status: 200});

    }else if(path === "/orders"){
      const userId = url.searchParams.get("userId");
      if(!userId){ return new Response("userId is missing.", {status:400}); }
      if(userId.length !== 24){ return new Response("userId doesnt meet length requirements.", {status:400}); }
      const cart = await cartsCollection.findOne({userId: new ObjectId(userId)});
      if(!cart || cart.products.length === 0 ){ return new Response("User cart is empty.", {status:400}); }

      const cartWithPrice = await getCartFormated(fromModeltoCart(cart), productsCollection);
      const total = cartWithPrice.products.reduce((sum, product) => { return sum + product.price; }, 0);
      const productsDB = await productsCollection.find().toArray();
      const products = productsDB.map((u)=> fromModeltoProduct(u));
      const orderModel = await fromCartToOrder(fromModeltoCart(cart), productsCollection, total);
      const canFulfillOrder = orderModel.products.every(orderProduct => {
        const productInStock = products.find(stockProduct => stockProduct.id === orderProduct.productId.toString());
        return productInStock && productInStock.stock >= orderProduct.quantity;
      });
      if (!canFulfillOrder) {
        return new Response("Not enough stock.", {status:400});
      }else{
        for (const orderItem of orderModel.products) {
          await productsCollection.updateOne( 
            { _id: new ObjectId(orderItem.productId) },
            { $inc: { stock: -orderItem.quantity } });
      }}
      const { insertedId }= await ordersCollection.insertOne({
        userId : orderModel.userId,
        products : orderModel.products,
        total : total,
        date : orderModel.date,
      })
      return new Response(JSON.stringify({
        orderId : insertedId,
        userId : orderModel.userId,
        products : orderModel.products,
        total : total,
        date : orderModel.date.toISOString().split('T')[0],
      }),{status:201});
    }
  }else if(method === "PUT"){
    if(path.startsWith("/products/")){
      const id = path.split("/products/")[1];
      const payload = await req.json();
      if(!payload.stock && !payload.price && !payload.name && !payload.description){
        return new Response("At least one field is required.", {status:400});
      }
      if(id.length !== 24){
        return new Response("Id doesnt meet length requirements.", {status:400});
      }
      const product = await productsCollection.findOne({_id:new ObjectId(id)});
      if(!product){
        return new Response("Product Id not found", {status:400});
      }
      const modifiedProduct = {
        name : payload.name ?? product.name,
        description : payload.description ?? product.description,
        stock : payload.stock ?? product.stock,
        price : payload.price ?? product.price,
      }
      await productsCollection.updateOne({_id:new ObjectId(id)},{$set:{stock: modifiedProduct.stock}});

      
      const productsDB = await productsCollection.findOne({_id:new ObjectId(id)});
      const products = fromModeltoProduct(productsDB!);
      if(products.description === null){
        const productsWithoutDescription = fromModeltoProductWithoutDescription(products);
        return new Response(JSON.stringify(productsWithoutDescription), {status:200});
      }
      return new Response(JSON.stringify(products), {status:200});      
    }
  }else if(method === "DELETE"){
    if(path === "/carts"){
      const userId = url.searchParams.get("userId");
      if(!userId){
        return new Response("userId is missing.", {status:400});
      }
      if(userId.length !== 24){
        return new Response("userId doesnt meet length requirements.", {status:400});
      }
      const cart = await cartsCollection.findOne({userId: new ObjectId(userId)});
      if(!cart){
        return new Response("User doesnt have a cart.", {status:400});
      }
      await cartsCollection.updateOne({userId: new ObjectId(userId)},{$set: { products: []}});
      return new Response("Cart empty.", {status:200});
    }else if(path==="/carts/products"){
      const userId = url.searchParams.get("userId");
      const productId = url.searchParams.get("productId");
      if(!userId || !productId){
        return new Response("userId and productId are needed.", {status:400});
      }
      if(userId.length !== 24 || productId.length !== 24){
        return new Response("userId and productId have to be 24 characters long.", {status:400});
      }
      const cart = await cartsCollection.findOne({userId: new ObjectId(userId)});
      if(!cart){
        return new Response("User doesnt have a cart.", {status:400});
      }
      await cartsCollection.updateOne({userId: new ObjectId(userId)},{$pull:{ products: { productId: new ObjectId(productId) }}})
      return new Response("Product deleted.", {status:200});
    }else if(path.startsWith("/products/")){
      const id = path.split("/products/")[1];
      if(id.length !== 24){
        return new Response("Id doesnt meet length requirements.", {status:400});
      }
      const productCart = await cartsCollection.findOne({products:  { productId: new ObjectId(id) } });
      const productOrder = await ordersCollection.findOne({products: { productId: new ObjectId(id) } });
      if(productCart || productOrder){
        return new Response("Product is in a cart/order",{status:400});
      }
      await productsCollection.deleteOne({_id: new ObjectId(id)});
      return new Response("Product deleted", {status:200});
    }
  }
  return new Response("Endpoint not found.", {status:404});
}

Deno.serve({port:3000}, handler);