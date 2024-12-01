import { Collection, ObjectId } from "mongodb";
import { Carts, CartsModel, FormatedCart, Orders, OrdersModel, Products, ProductsModel, Users, UsersModel } from "./types.ts";

export const fromModeltoUser = (model:UsersModel): Users=>{
    return{
        id: model._id!.toString(),
        name: model.name,
        email: model.email,
        password: model.password,
    }   
}

export const fromModeltoProduct = (model:ProductsModel): Products=>{
    return{
        id: model._id!.toString(),
        name: model.name,
        description: model.description,
        price: model.price,
        stock: model.stock,
    }}

export const fromModeltoProductWithoutDescription = (model:Products)=>{
    return{
        id: model.id,
        name: model.name,
        price: model.price,
        stock: model.stock,
    }}

export const fromModeltoCart = (model:CartsModel): Carts=>{
    return{
        id: model._id!.toString(),
        userId: model.userId.toString(),
        products : model.products.map((u)=> {return{
            productId: u.productId.toString(), 
            quantity : u.quantity,}})
    }}

export const fromModeltoOrder = (model:OrdersModel): Orders=>{
    return{
        id: model._id!.toString(),
        userId: model.userId.toString(),
        products : model.products.map((u)=> {return{
            productId: u.productId.toString(), 
            quantity : u.quantity,
            price : u.price}}),
        total : model.total,
        date : model.date.toISOString().split('T')[0],
    }}    

export const fromCartToOrder = async (model:Carts, productsCollection:Collection<ProductsModel>, total: number):Promise<OrdersModel>=>{
    const transformedProducts = await Promise.all(
        model.products.map(async (product) => {
            const productDetails = await productsCollection.findOne({ _id: new ObjectId(product.productId) });
    
            return {
            productId: new ObjectId(product.productId),
            quantity: product.quantity,
            price: (productDetails!.price)
            };
        })
    );
    return{
        userId: new ObjectId(model.userId),
        products : transformedProducts,
        total : total,
        date : new Date(),
    }}    
export const getCartFormated = async (users: Carts, productsCollection:Collection<ProductsModel>): Promise<FormatedCart> => {
    const transformedProducts = await Promise.all(
        users.products.map(async (product) => {
            const productDetails = await productsCollection.findOne({ _id: new ObjectId(product.productId) });
    
            return {
            productId: product.productId,
            name: productDetails!.name,
            quantity: product.quantity,
            price: (productDetails?.price || 0) * product.quantity
            };
        })
    );
    return {
        userId: users.id,
        products: transformedProducts
    };
};