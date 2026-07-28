import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import styles from "../styles/header.module.css";

export default function Header() {
  const { toggleCart, items } = useCart();
  const [isVisible, setIsVisible] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      setAtTop(currentScrollY === 0);

      if (Math.abs(currentScrollY - lastScrollY) > 10) {
        if (currentScrollY > lastScrollY && currentScrollY > 50) {
          setIsVisible(false); // Bajando: esconde
        } else {
          setIsVisible(true); // Subiendo: muestra
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener("scroll", controlNavbar);
    return () => window.removeEventListener("scroll", controlNavbar);
  }, [lastScrollY]);

  return (
    <>
      <header className={`
        ${styles.header}
        ${isVisible ? styles.visible : styles.hidden}
        ${atTop ? styles.atTop : styles.scrolled}
      `}>
        {/* BOTÓN HAMBURGUESA (Móvil) */}
        <button className={styles.hamburgerBtn} onClick={toggleMenu} aria-label="Abrir menú">
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* SECCIÓN IZQUIERDA (Escritorio) */}
        <nav className={styles.navSide}>
          <a href="/">TIENDA</a>
          <a href="/personalizacion">PERSONALIZACIÓN</a>
          <a href="/esencia">NUESTRA ESENCIA</a>
        </nav>

        {/* SECCIÓN CENTRAL (LOGO - SIEMPRE VISIBLE) */}
        <div className={styles.logo}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <h1>ECOMMERCE</h1>
          </a>
        </div>

        {/* SECCIÓN DERECHA */}
        <div className={styles.actions}>
          <nav className={styles.navSideRight}>
            <a href="/comunidad">COMUNIDAD</a>
            <a href="/tallas">GUÍA DE TALLAS</a>
          </nav>

          <button className={styles.cartBtn} onClick={toggleCart}>
            CARRITO ({items.length})
          </button>
        </div>
      </header>

      {/* MENÚ LATERAL DESPLEGABLE (Móvil) */}
      <div className={`${styles.mobileOverlay} ${menuOpen ? styles.overlayVisible : ""}`} onClick={toggleMenu} />
      <div className={`${styles.mobileDrawer} ${menuOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerHeader}>
          <h2>MENÚ</h2>
          <button className={styles.closeBtn} onClick={toggleMenu}>✕</button>
        </div>
        <div className={styles.mobileNavLinks}>
          <a href="/" onClick={toggleMenu}>TIENDA</a>
          <a href="/personalizacion" onClick={toggleMenu}>PERSONALIZACIÓN</a>
          <a href="/esencia" onClick={toggleMenu}>NUESTRA ESENCIA</a>
          <a href="/comunidad" onClick={toggleMenu}>COMUNIDAD</a>
          <a href="/tallas" onClick={toggleMenu}>GUÍA DE TALLAS</a>
        </div>
      </div>
    </>
  );
}