import { useEffect } from "react";
import { useCart } from "../context/CartContext";
import styles from "../styles/cartDrawer.module.css";

export default function CartDrawer() {
  const { isOpen, toggleCart, items, removeItem } = useCart();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const total = items.reduce((sum, i) => sum + i.quantity * i.price_snapshot, 0);

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ""}`}
        onClick={toggleCart}
      />

      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.cartHeader}>
          <h2>TU CARRITO</h2>
          <button className={styles.closeBtn} onClick={toggleCart}>✕</button>
        </div>

        <div className={styles.contentWrapper}>
          {items.length === 0 ? (
            <p className={styles.emptyMsg}>Tu carrito está vacío.</p>
          ) : (
            <div className={styles.cartItems}>
              {items.map((item, idx) => {
                // Imagen principal de ESTA variante específica (criterio único: is_main)
                const img = item.variant?.images?.find(img => img.is_main)?.img_url;

                return (
                  <div key={idx} className={styles.cartItem}>
                    <div className={styles.imgContainer}>
                      {img && <img src={img} alt="producto" className={styles.cartImg} />}
                    </div>

                    <div className={styles.cartInfo}>
                      <div className={styles.itemHeader}>
                        <strong>{item.name || "Producto"}</strong>
                        <button
                          className={styles.removeBtn}
                          onClick={() => removeItem(idx)}
                        >
                          ✕
                        </button>
                      </div>

                      <div className={styles.details}>
                        <p>{item.variant?.material?.name_m} | {item.variant?.color?.color_name}</p>
                        <p>Talla: {item.variant?.size?.size_value} | Tacón: {item.variant?.heel?.height_value} cm</p>
                        {item.variant?.print?.name_print !== "Ninguno" && (
                          <p>Print: {item.variant?.print?.name_print}</p>
                        )}
                        <p className={styles.qty}>Cantidad: {item.quantity}</p>
                      </div>

                      <p className={styles.price}>${item.price_snapshot}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.totalRow}>
            <span>SUBTOTAL</span>
            <span>${total}</span>
          </div>
          <p className={styles.taxInfo}>Impuestos y envío calculados al finalizar.</p>
          <button className={styles.checkoutBtn}>FINALIZAR COMPRA</button>
        </div>
      </div>
    </>
  );
}
