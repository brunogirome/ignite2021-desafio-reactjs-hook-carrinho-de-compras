import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get(`/stock/${productId}`);

      const { amount: stockAmount }: Stock = response.data;

      if (stockAmount < 1) {
        toast.error('Não há estoque disponível para este produto.');
        return;
      }

      const isProductInCart: Product | undefined = cart.find(
        product => product.id === productId,
      );

      if (isProductInCart && isProductInCart.amount >= stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (isProductInCart) {
        const updatedCart = [...cart];

        updatedCart.forEach(product => {
          if (product.id === productId) {
            product.amount = product.amount + 1;
          }
        });

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        return;
      }

      const { data: product } = await api.get(`/products/${productId}`);

      product.amount = 1;

      setCart([...cart, product]);
      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify([...cart, product]),
      );
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductInCart: Product | undefined = cart.find(
        product => product.id === productId,
      );

      if (!isProductInCart) {
        throw new Error('This product does not exist.');
      }

      let updatedCart = [...cart].filter(product => product.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const isProductInCart: Product | undefined = cart.find(
        product => product.id === productId,
      );

      if (!isProductInCart) {
        throw new Error('The product is not in the cart.');
      }

      const response = await api.get(`/stock/${productId}`);
      const { amount: stockAmount }: Stock = response.data;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (amount <= 0) {
        removeProduct(productId);
        return;
      }

      const updatedCart = [...cart];
      updatedCart.forEach(product => {
        if (product.id === productId) {
          product.amount = amount;
        }
      });

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
