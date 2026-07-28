import Link from 'next/link';
import styles from '../styles/examplePage.module.css';

export default function EsenciaPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.overline}>Nuestra Esencia</div>
      <h1 className={styles.title}>La historia de marca que da contexto a cada producto</h1>
      <p className={styles.description}>
        Esta sección representaría el storytelling de la marca: manifiesto, valores,
        proceso de diseño y la voz que conecta el catálogo con la comunidad.
      </p>
      <div className={styles.noteBox}>
        <div className={styles.noteLabel}>Página de ejemplo</div>
        <p className={styles.noteText}>
          En una versión de producción, aquí iría contenido editorial real
          (fotografía de marca, historia, valores) gestionado desde un CMS o
          desde las tablas <code>media_assets</code> / <code>asset_types</code> ya
          existentes en el esquema. Se deja como vitrina de arquitectura, fuera
          del alcance funcional de esta demo.
        </p>
      </div>
      <Link href="/" className={styles.backLink}>Volver a la tienda</Link>
    </div>
  );
}
