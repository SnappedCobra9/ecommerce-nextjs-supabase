import { supabase } from '../../lib/supabaseClient'
import { useState, useRef, useEffect } from 'react'
import styles from '../../styles/product.module.css'
import { useCart } from '../../context/CartContext'

export async function getServerSideProps({ params }) {
  const { id } = params
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id, name, description, price,
      variants (
        id, quantity,
        material:materials(name_m, img_m),
        color:colors(color_name, img_c),
        size:sizes(size_value),
        heel:heels(height_value, img_h),
        print:prints(name_print, img_p),
        images(img_url, is_main, position)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !product) return { notFound: true }
  return { props: { product } }
}

// Orden único para toda la app: la foto is_main siempre va primero,
// el resto se ordena por "position" ascendente.
const sortImages = (images = []) => {
  return images
    .slice()
    .sort((a, b) => {
      if (a.is_main && !b.is_main) return -1
      if (!a.is_main && b.is_main) return 1
      return (a.position ?? 0) - (b.position ?? 0)
    })
}

export default function ProductPage({ product }) {
  const variants = product?.variants || [];
  const initialVariant = variants.find(v => v.images?.some(img => img.is_main)) || variants[0] || {};

  const [selection, setSelection] = useState({})
  const [selectedVariant, setSelectedVariant] = useState(initialVariant)
  const [showPersonalize, setShowPersonalize] = useState(false)
  const [summaryActive, setSummaryActive] = useState(false)
  const [activeStep, setActiveStep] = useState(1)

  const { addItem, toggleCart } = useCart()

  const productRightRef = useRef(null)
  const personalizeTitleRef = useRef(null)
  const summaryRef = useRef(null)
  const materialRef = useRef(null)
  const colorRef = useRef(null)
  const sizeRef = useRef(null)
  const heelRef = useRef(null)

  useEffect(() => {
    setSelection({})
    setSelectedVariant(initialVariant)
    setShowPersonalize(false)
    setSummaryActive(false)
    setActiveStep(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  const getUniqueOptions = (keyPath, labelKey, imgKey) => {
    const map = new Map();
    variants.forEach(v => {
      const item = keyPath.split('.').reduce((o, i) => o?.[i], v);
      if (item && item[labelKey]) {
        map.set(item[labelKey], { label: item[labelKey], img: item[imgKey] });
      }
    });
    return Array.from(map.values());
  };

  const materials = getUniqueOptions('material', 'name_m', 'img_m');
  const colors = getUniqueOptions('color', 'color_name', 'img_c');
  const prints = getUniqueOptions('print', 'name_print', 'img_p');
  const heels = getUniqueOptions('heel', 'height_value', 'img_h');
  const sizes = Array.from(new Set(variants.map(v => v.size?.size_value))).filter(Boolean).sort();

  const isPrintMaterial = selection.material === 'Print' || selection.material === 'Estampado';

  const scrollToRef = ref => {
    if (!productRightRef.current || !ref?.current) return
    const container = productRightRef.current
    const element = ref.current
    const targetScroll = element.offsetTop - container.offsetTop
    container.scrollTo({ top: targetScroll, behavior: 'smooth' })
  }

  const goToPersonalize = () => {
    setShowPersonalize(true)
    setTimeout(() => scrollToRef(personalizeTitleRef), 100)
  }

  const handleSelect = (attr, value, refToScroll, stepNumber) => {
    const newSelection = { ...selection, [attr]: value };

    if (attr === 'material') {
      newSelection.color = null;
      newSelection.print = null;
      newSelection.size = null;
      newSelection.heel = null;
    }

    setSelection(newSelection)

    const isPrintMaterialNow = newSelection.material === 'Print' || newSelection.material === 'Estampado';

    const variant = variants.find(v => {
      const matchMaterial = !newSelection.material || v.material?.name_m === newSelection.material;
      let matchStyle = true;
      if (isPrintMaterialNow) {
        matchStyle = !newSelection.print || v.print?.name_print === newSelection.print;
      } else {
        matchStyle = !newSelection.color || v.color?.color_name === newSelection.color;
      }
      const matchSize = !newSelection.size || String(v.size?.size_value) === String(newSelection.size);
      const matchHeel = !newSelection.heel || String(v.heel?.height_value) === String(newSelection.heel);

      return matchMaterial && matchStyle && matchSize && matchHeel;
    })

    // Si no encuentra variante, limpiamos selectedVariant para evitar
    // mostrar una imagen/combinación "fantasma" que ya no aplica.
    setSelectedVariant(variant || null);

    if (stepNumber > activeStep) setActiveStep(stepNumber)

    const materialSelected = !!newSelection.material;
    const styleSelected = isPrintMaterialNow ? !!newSelection.print : !!newSelection.color;
    const sizeSelected = !!newSelection.size;
    const heelSelected = !!newSelection.heel;

    if (materialSelected && styleSelected && sizeSelected && heelSelected) {
      setSummaryActive(true)
      setTimeout(() => scrollToRef(summaryRef), 300)
    } else {
      setSummaryActive(false)
      if (refToScroll) setTimeout(() => scrollToRef(refToScroll), 100)
    }
  }

  const handleAddToCart = () => {
    if (!selectedVariant || !selectedVariant.id) {
      alert("Esta combinación no está disponible en inventario.");
      return;
    }

    const cleanVariant = JSON.parse(JSON.stringify(selectedVariant));

    addItem({
      variant_id: cleanVariant.id,
      product_id: product.id,
      name: product.name,
      quantity: 1,
      price_snapshot: product.price,
      variant: cleanVariant,
      customizationKey: `${product.id}-${cleanVariant.id}-${Date.now()}`
    });

    toggleCart();

    // Reseteo total de la selección para que el siguiente producto
    // empiece desde cero.
    setSelection({});
    setSelectedVariant(initialVariant);
    setActiveStep(1);
    setSummaryActive(false);
  }

  const galleryImages = sortImages(selectedVariant?.images);

  return (
    <div className={styles.pageWrapper}>
      <main className={styles.productMain}>
        <section className={styles.gallery}>
          {galleryImages.length > 0 ? (
            galleryImages.map((img, idx) => (
              <div key={idx} className={styles.imageContainer}>
                <img src={img.img_url} alt={`${product.name} view ${idx}`} />
              </div>
            ))
          ) : (
            <div className={styles.noImage}>Combinación de imagen no disponible</div>
          )}
        </section>

        <aside ref={productRightRef} className={styles.sidebar}>
          <div className={styles.stickyContent}>
            <header className={styles.productHeader}>
              <h1 className={styles.productName}>{product.name}</h1>
              <p className={styles.price}>${product.price}</p>
              <div className={styles.description}><p>{product.description}</p></div>
              {!showPersonalize && (
                <button className={styles.buttonPrimary} onClick={goToPersonalize}>Personalizar y Comprar</button>
              )}
            </header>

            {showPersonalize && (
              <div className={styles.personalizationFlow}>
                <h2 ref={personalizeTitleRef} className={styles.sectionTitle}>Personalización</h2>

                {/* 1. MATERIAL */}
                <div ref={materialRef} className={styles.optionGroup}>
                  <label>01. Material</label>
                  <div className={styles.carouselContainer}>
                    {materials.map(m => (
                      <button
                        key={m.label}
                        onClick={() => handleSelect('material', m.label, colorRef, 2)}
                        className={`${styles.imageOptionBtn} ${selection.material === m.label ? styles.selected : ''}`}
                      >
                        <div className={styles.imgBackground} style={{ backgroundImage: `url(${m.img})` }} />
                        <span className={styles.optionLabel}>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. COLOR O PRINT */}
                {activeStep >= 2 && (
                  <div ref={colorRef} className={`${styles.optionGroup} ${styles.fadeIn}`}>
                    <label>02. {isPrintMaterial ? 'Estampado' : 'Color'}</label>
                    <div className={styles.carouselContainer}>
                      {(isPrintMaterial ? prints : colors).map(item => (
                        <button
                          key={item.label}
                          onClick={() => handleSelect(isPrintMaterial ? 'print' : 'color', item.label, sizeRef, 3)}
                          className={`${styles.imageOptionBtn} ${selection[isPrintMaterial ? 'print' : 'color'] === item.label ? styles.selected : ''}`}
                        >
                          <div className={styles.imgBackground} style={{ backgroundImage: `url(${item.img})` }} />
                          <span className={styles.optionLabel}>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. TALLA */}
                {activeStep >= 3 && (
                  <div ref={sizeRef} className={`${styles.optionGroup} ${styles.fadeIn}`}>
                    <label>03. Talla</label>
                    <div className={styles.textGrid}>
                      {sizes.map(s => (
                        <button key={s} onClick={() => handleSelect('size', s, heelRef, 4)}
                          className={`${styles.textOptionBtn} ${selection.size === s ? styles.selectedText : ''}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. TACÓN */}
                {activeStep >= 4 && (
                  <div ref={heelRef} className={`${styles.optionGroup} ${styles.fadeIn}`}>
                    <label>04. Altura de Tacón</label>
                    <div className={styles.carouselContainer}>
                      {heels.map(h => (
                        <button key={h.label} onClick={() => handleSelect('heel', h.label, null, 5)}
                          className={`${styles.imageOptionBtn} ${selection.heel === h.label ? styles.selected : ''}`}>
                          <div className={styles.imgBackground} style={{ backgroundImage: `url(${h.img})` }} />
                          <span className={styles.optionLabel}>{h.label} cm</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {summaryActive && (
                  <footer ref={summaryRef} className={`${styles.purchaseSection} ${styles.fadeIn}`}>
                    <div className={styles.summaryCard}>
                      <h3>Tu Configuración</h3>
                      <p>{selection.material} / {isPrintMaterial ? selection.print : selection.color} / {selection.size} / {selection.heel}cm</p>
                    </div>
                    <button
                      className={styles.buttonPrimary}
                      onClick={handleAddToCart}
                      disabled={!selectedVariant}
                      style={{ backgroundColor: !selectedVariant ? '#888' : '', cursor: !selectedVariant ? 'not-allowed' : 'pointer' }}
                    >
                      {selectedVariant ? 'Añadir al Carrito' : 'Combinación No Disponible'}
                    </button>
                  </footer>
                )}
              </div>
            )}
            {showPersonalize && <div className={styles.bottomSpacer} />}
          </div>
        </aside>
      </main>
      <div className={styles.footerSpacer}><p>  © 2026</p></div>
    </div>
  )
}
