export interface Product {
  id: string;
  name: string;
  price: number; // dollars, e.g. 4.99
}

export const PRODUCTS: Product[] = [
  { id: "mug", name: "Coffee Mug", price: 12.5 },
  { id: "sticker", name: "Sticker Pack", price: 4.99 },
  { id: "tote", name: "Tote Bag", price: 18 },
  { id: "notebook", name: "Notebook", price: 7.25 },
];
