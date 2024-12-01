import { ObjectId, OptionalId } from "mongodb";

export type productsWithID = {
    productId: ObjectId,
    quantity: number,
}

export type productsWithoutID = {
    productId: string,
    quantity: number,
}

export type orderProductsModel = {
    productId: ObjectId,
    quantity: number,
    price: number,
}

export type orderProducts = {
    productId: string,
    quantity: number,
    price: number,
}


export type UsersModel = OptionalId<{
    name: string,
    email: string,
    password: string,
}>

export type ProductsModel = OptionalId<{
    name: string,
    description?: string,
    price: number,
    stock: number,
}>

export type CartsModel = OptionalId<{
    userId: ObjectId,
    products: productsWithID[],
}>

export type OrdersModel = OptionalId<{
    userId: ObjectId,
    products: orderProductsModel[],
    total: number,
    date: Date,
}>

export type Users = {
    id: string,
    name: string,
    email: string,
    password: string,
}

export type Products = {
    id: string,
    name: string,
    description?: string,
    price: number,
    stock: number,
}

export type Carts = {
    id: string
    userId: string,
    products: productsWithoutID[],
}
export type FormatedCart = { 
    userId: string; 
    products: Array<{ 
        productId: string; 
        name: string; 
        quantity: number; 
        price: number 
    }> 
}

export type Orders = {
    id: string
    userId: string,
    products: orderProducts[],
    total: number,
    date: string,
}