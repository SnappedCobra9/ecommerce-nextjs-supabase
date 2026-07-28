import { CartProvider } from "../context/CartContext";
import Header from "../components/Header";
import CartDrawer from "../components/CartDrawer";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <CartProvider>
      <Header />
      <CartDrawer />
      <Component {...pageProps} />
    </CartProvider>
  );
}
