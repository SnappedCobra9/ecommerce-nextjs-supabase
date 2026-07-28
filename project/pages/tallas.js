import Link from 'next/link';
import styles from '../styles/examplePage.module.css';

export default function TallasPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.overline}>Guía de Tallas</div>
      <h1 className={styles.title}>Encuentra tu ajuste perfecto</h1>
      <p className={styles.description}>
        Esta sección representaría una guía interactiva de tallas y altura de
        tacón, con tabla de equivalencias y recomendaciones según el modelo.
      </p>
      <div className={styles.noteBox}>
        <div className={styles.noteLabel}>Página de ejemplo</div>
        <p className={styles.noteText}>
          La selección real de talla y altura de tacón ya funciona dentro del
          configurador de producto (<code>/products/[id]</code>), leyendo las
          tablas <code>sizes</code> y <code>heels</code>. Esta página
          independiente es solo una vitrina de arquitectura para una guía de
          referencia más completa a futuro.
        </p>
      </div>
      <Link href="/" className={styles.backLink}>Volver a la tienda</Link>
    </div>
  );
}
