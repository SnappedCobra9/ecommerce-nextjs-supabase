import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);

  // Carga inicial desde LocalStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error("Error al leer el carrito:", error);
      }
    }
  }, []);

  const toggleCart = () => setIsOpen(!isOpen);

  const addItem = (newItem) => {
    setItems((prev) => {
      let updatedCart;

      // Se compara por variant_id Y product_id juntos para evitar que dos
      // productos distintos que por algún motivo compartan variant_id
      // (bug de datos, semillas de prueba, etc.) se fusionen en el carrito.
      const existingItemIndex = prev.findIndex(
        (item) =>
          item.variant_id === newItem.variant_id &&
          item.product_id === newItem.product_id
      );

      if (existingItemIndex >= 0) {
        // Misma variante exacta: solo sumamos cantidad
        updatedCart = [...prev];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + (newItem.quantity || 1),
        };
      } else {
        // Variante distinta: nueva fila independiente en el carrito
        updatedCart = [...prev, newItem];
      }

      localStorage.setItem("cart", JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  // removeItem recibe el índice del array (posición dentro de "items"),
  // ya que items no garantiza un id único propio en todos los casos.
  const removeItem = (index) => {
    setItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      localStorage.setItem("cart", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <CartContext.Provider value={{ isOpen, toggleCart, items, addItem, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
