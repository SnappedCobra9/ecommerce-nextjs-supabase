import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/home.module.css';

export async function getServerSideProps() {
  const { data: allAssets, error: assetsError } = await supabase
    .from('media_assets')
    .select(`id, seccion, image_url, button_label, asset_types!inner (slug)`)
    .in('asset_types.slug', ['home-hero', 'color-del-mes'])
    .eq('is_active', true);

  const { data: categories, error: categoriesError } = await supabase
    .from('producttypes')
    .select('id, type_name')
    .order('id', { ascending: true });

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id, name, price, description, main_img, hover_img, type_id,
      variants (
        id, color_id,
        colors (id, color_name, img_c),
        images (img_url, is_main)
      )
    `)
    .eq('active', true);

  console.log('--- DEBUG HOME ---');
  console.log('categories:', categories, 'error:', categoriesError);
  console.log('products count:', products?.length, 'error:', productsError);
  console.log('allAssets count:', allAssets?.length, 'error:', assetsError);
  console.log('------------------');

  return {
    props: {
      allAssets: allAssets || [],
      categories: categories || [],
      initialProducts: products || []
    }
  };
}

export default function HomePage({ allAssets, categories, initialProducts }) {
  const carouselRef = useRef(null);
  const leftSlides = allAssets.filter(a => a.seccion === 'Banner1');
  const rightSlides = allAssets.filter(a => a.seccion === 'Banner2');
  const assetColorMes = allAssets.find(a => a.seccion === 'Color del Mes');
  const nombreColorMes = assetColorMes ? assetColorMes.button_label : null;

  const [currentLeft, setCurrentLeft] = useState(0);
  const [currentRight, setCurrentRight] = useState(0);
  const [activeCategory, setActiveCategory] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories]);

  const handleCategoryChange = (id) => {
    if (id === activeCategory) return;
    setIsVisible(false);
    setTimeout(() => {
      setActiveCategory(id);
      if (carouselRef.current) {
        carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
      setIsVisible(true);
    }, 400);
  };

  useEffect(() => {
    if (!activeCategory) return;
    const currentCat = categories.find(c => c.id === activeCategory);
    const isColorMesActive = currentCat?.type_name.toLowerCase().includes('mes');

    if (isColorMesActive) {
      const special = initialProducts
        .filter(p => p.variants?.some(v => v.colors?.color_name === nombreColorMes))
        .map(p => {
          const vMatch = p.variants.find(v => v.colors?.color_name === nombreColorMes);
          // FIX: antes se usaba position === 1, criterio distinto al resto
          // de la app. Se unifica a is_main como único criterio de
          // "imagen principal de una variante" en todo el proyecto.
          const specificImg = vMatch?.images?.find(img => img.is_main)?.img_url;
          return { ...p, displayImg: specificImg || p.main_img, isColorMes: true };
        });
      setFilteredProducts(special);
    } else {
      const normal = initialProducts
        .filter(p => p.type_id === activeCategory)
        .map(p => ({ ...p, displayImg: p.main_img, isColorMes: false }));
      setFilteredProducts(normal);
    }
  }, [activeCategory, initialProducts, nombreColorMes, categories]);

  useEffect(() => {
    const intL = setInterval(() => setCurrentLeft(p => (p === leftSlides.length - 1 ? 0 : p + 1)), 5000);
    const intR = setInterval(() => setCurrentRight(p => (p === rightSlides.length - 1 ? 0 : p + 1)), 6000);
    return () => { clearInterval(intL); clearInterval(intR); };
  }, [leftSlides.length, rightSlides.length]);

  return (
    <div className={styles.homeContainer}>
      <section className={styles.homeHeroSplit}>
        <div className={styles.carouselColumn}>
          {leftSlides.map((slide, i) => (
            <div key={slide.id} className={`${styles.slide} ${i === currentLeft ? styles.active : ''}`}>
              <img src={slide.image_url} alt="Hero" />
            </div>
          ))}
        </div>
        <div className={styles.carouselColumn}>
          {rightSlides.map((slide, i) => (
            <div key={slide.id} className={`${styles.slide} ${i === currentRight ? styles.active : ''}`}>
              <img src={slide.image_url} alt="Hero" />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.shopSection}>
        <div className={styles.categoryNav}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.categoryTab} ${activeCategory === cat.id ? styles.activeTab : ''} ${cat.type_name.toLowerCase().includes('mes') ? styles.colorMesTab : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.type_name}
            </button>
          ))}
        </div>

        <div className={styles.productCarouselContainer} ref={carouselRef}>
  <div className={`${styles.productGrid} ${isVisible ? styles.productGridVisible : ''}`}>
    {filteredProducts.map((product) => {
      // 1. Obtenemos solo los colores únicos usando un Set o filter basado en img_c o un identificador de color
      const uniqueColors = product.variants ? Array.from(
        new Map(product.variants.map(v => [v.colors?.img_c, v])).values()
      ) : [];

      return (
        <Link href={`/products/${product.id}`} key={product.id} className={styles.productCard}>
          <div className={styles.imageContainer}>
            <img src={product.displayImg} alt={product.name} className={styles.mainImg} />
            <img src={product.hover_img} alt={product.name} className={styles.hoverImg} />
            <button className={styles.buyButton}>VER DETALLES</button>
          </div>
          <div className={styles.productInfo}>
            <h3>{product.name}</h3>
            <p className={styles.description}>{product.description?.substring(0, 60)}...</p>
            <span className={styles.price}>${product.price}</span>
            {!product.isColorMes && (
              <div className={styles.colorSelector}>
                {/* 2. Mapeamos los colores únicos en lugar de product.variants */}
                {uniqueColors.map((v, i) => (
                  <div key={i} className={styles.colorCircle} style={{ backgroundImage: `url(${v.colors?.img_c})` }} />
                ))}
              </div>
            )}
          </div>
        </Link>
      );
    })}
  </div>
</div>
      </section>

      <section className={styles.customBanner}>
        <img src="https://samplelib.com/lib/preview/jpeg/sample-clouds-400x300.jpg" alt="Materiales y texturas" />
        <div className={styles.customOverlay}>
          <Link href="/personalizacion">
            <button className={styles.whiteButton}>Conoce nuestros materiales</button>
          </Link>
        </div>
      </section>

      <section className={styles.communityPreview}>
        <div className={styles.communityImage}>
          <img src="https://samplelib.com/lib/preview/jpeg/sample-clouds-400x300.jpg" alt="Comunidad Lina Heels" />
        </div>
        <div className={styles.communityInfo}>
          <h2>Nuestra esencia en movimiento</h2>
          <p className={styles.description}>
            Diseñamos para quienes entienden que el baile no es solo técnica, es expresión pura. Únete a nuestra comunidad de profesionales.
          </p>
          <Link href="/esencia">
            <button className={styles.outlineButton}>Conoce más</button>
          </Link>
        </div>
      </section>

      <footer className={styles.footerSpacer}>
        <p>   © 2026 | CALIDAD ATEMPORAL</p>
      </footer>
    </div>
  );
}
