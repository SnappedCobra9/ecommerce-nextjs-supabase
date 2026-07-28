import Link from 'next/link';
import styles from '../styles/examplePage.module.css';

export default function ComunidadPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.overline}>Comunidad</div>
      <h1 className={styles.title}>Un espacio para bailarines y profesionales Lina Heels</h1>
      <p className={styles.description}>
        Esta sección representaría contenido generado por usuarios: reseñas con
        fotos, testimonios de clientes y una vitrina de la comunidad que usa
        el producto.
      </p>
      <div className={styles.noteBox}>
        <div className={styles.noteLabel}>Página de ejemplo</div>
        <p className={styles.noteText}>
          En una versión de producción, aquí se listarían reseñas reales usando
          las tablas <code>reviews</code> / <code>review_images</code> del
          esquema original. Se deja como vitrina de arquitectura, fuera del
          alcance funcional de esta demo.
        </p>
      </div>
      <Link href="/" className={styles.backLink}>Volver a la tienda</Link>
    </div>
  );
}
