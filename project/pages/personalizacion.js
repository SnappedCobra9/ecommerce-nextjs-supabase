import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/personalizacion.module.css';

export async function getServerSideProps() {
  const { data: products } = await supabase.from('products').select('*').eq('active', true);
  const { data: materials } = await supabase.from('materials').select('*');
  const { data: colorTypes } = await supabase.from('color_types').select('*');
  const { data: allColors } = await supabase.from('colors').select('*');
  const { data: prints } = await supabase.from('prints').select('*');
  const { data: variants } = await supabase.from('variants').select('*');

  const validMap = {};
  if (variants) {
    variants.forEach(v => {
      if (!validMap[v.material_id]) validMap[v.material_id] = { colors: [], prints: [] };
      if (v.color_id) validMap[v.material_id].colors.push(v.color_id);
      if (v.print_id) validMap[v.material_id].prints.push(v.print_id);
    });
  }

  return {
    props: {
      products: products || [], materials: materials || [], allColors: allColors || [],
      colorTypes: colorTypes || [], prints: prints || [], validMap
    }
  };
}

export default function PersonalizacionPage({ products, materials, allColors, colorTypes, prints, validMap }) {
  const [activeModel, setActiveModel] = useState(null);
  const [currentView, setCurrentView] = useState('detalle');
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [isImgLoading, setIsImgLoading] = useState(false);

  const expansionRef = useRef(null);
  const materialsSectionRef = useRef(null);

  useEffect(() => {
    if (selectedMaterial && expansionRef.current) {
      const offset = 80;
      const elementPosition = expansionRef.current.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
  }, [selectedMaterial]);

  const handleCloseMaterial = (e) => {
    if (e) e.stopPropagation();

    if (materialsSectionRef.current) {
      const offset = 50;
      const elementPosition = materialsSectionRef.current.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }

    setTimeout(() => {
      setSelectedMaterial(null);
      setSelectedColor(null);
    }, 150);
  };

  const groupedColors = useMemo(() => {
    if (!selectedMaterial || !validMap[selectedMaterial.id]) return {};
    const allowedIds = validMap[selectedMaterial.id].colors;
    const available = allColors.filter(c => allowedIds.includes(c.id));
    const groups = {};
    available.forEach(color => {
      const typeRecord = colorTypes.find(t => t.id === color.color_type);
      let typeName = typeRecord ? typeRecord.type_color : "General";
      if (!groups[typeName]) groups[typeName] = [];
      groups[typeName].push(color);
    });
    return groups;
  }, [selectedMaterial, allColors, colorTypes, validMap]);

  const isPrintMaterial = selectedMaterial?.name_m?.toLowerCase().includes('print');
  const availablePrints = useMemo(() => {
    if (!selectedMaterial || !validMap[selectedMaterial.id]) return [];
    return prints.filter(p => validMap[selectedMaterial.id].prints.includes(p.id));
  }, [selectedMaterial, prints, validMap]);

  return (
    <div className={styles.container}>

      {/* SECCIÓN 0: HERO */}
      <section className={styles.heroSection}>
        <div className={styles.manifiesto}>
          <div className={styles.overline}>ECOMMERCE</div>
          <h2>La arquitectura del calzado diseñada para elevar tu presencia.</h2>
        </div>
      </section>

      {/* SECCIÓN 1: GALLERY (SILUETAS) */}
      <section className={styles.gallerySection}>
        <div className={styles.titleHeader}>
          <h1>Siluetas</h1>
          <div className={styles.scrollText}>Selecciona tu base</div>
        </div>
        <div className={styles.productCarouselContainer}>
          <div className={styles.productGrid}>
            {products.map((p) => (
              <div key={p.id} className={styles.modelCard} onClick={() => setActiveModel(p)}>
                <img src={p.main_img} className={styles.cardImg} alt={p.name} />
                <div className={styles.modelInfo}>
                    <h3>{p.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: VISOR OVERLAY */}
      {activeModel && (
        <div className={styles.detailOverlay}>
            <div className={styles.detailContent}>
                <div className={styles.sidebarControls}>
                    <button className={`${styles.actionBtn} ${currentView === 'detalle' ? styles.btnActive : ''}`} onClick={() => setCurrentView('detalle')}>Visión</button>
                    <button className={`${styles.actionBtn} ${currentView === 'material' ? styles.btnActive : ''}`} onClick={() => setCurrentView('material')}>Materials</button>
                    <button className={`${styles.actionBtn} ${currentView === 'colors' ? styles.btnActive : ''}`} onClick={() => setCurrentView('colors')}>Color+</button>
                </div>
                <div className={styles.visualCanvas}>
                    <img src={currentView === 'detalle' ? activeModel.hover_img : activeModel.main_img} className={styles.shoeBaseLarge} alt={activeModel.name}/>
                    <button className={styles.closeBtn} onClick={() => setActiveModel(null)}>X</button>
                </div>
            </div>
        </div>
      )}

      {/* SECCIÓN 3: DIVISOR */}
      <div className={styles.parallaxDivider}>
        <div className={styles.dividerOverlay}>
            <h2>Pureza en el origen</h2>
        </div>
      </div>

      {/* SECCIÓN 4: MATERIALES */}
      <section ref={materialsSectionRef} className={styles.materialsShowcase}>
        <div className={styles.materialsHeader}>
          <div className={styles.stepNumber}>02</div>
          <h2>Texturas</h2>
        </div>
        <div className={styles.swatchesContainer}>
          {materials.map((mat) => (
            <div
              key={mat.id}
              className={`${styles.swatchItem} ${selectedMaterial?.id === mat.id ? styles.swatchActive : ''}`}
              onClick={() => {
                setSelectedMaterial(selectedMaterial?.id === mat.id ? null : mat);
                setSelectedColor(null);
                setIsImgLoading(true);
              }}
            >
              <div className={styles.swatchCircle}><img src={mat.img_m} alt={mat.name_m} /></div>
              <div className={styles.swatchName}>{mat.name_m}</div>
            </div>
          ))}
        </div>

        {/* SECCIÓN 5: EXPANSIÓN */}
        <div ref={expansionRef} className={`${styles.expansionWrapper} ${selectedMaterial ? styles.expanded : ''}`}>
          {selectedMaterial && (
            <div className={styles.materialExplainerInline}>
                <div className={styles.explainerLeft}>
                    <div className={styles.gradientOverlay}></div>
                    <img
                        src={selectedColor ? (selectedColor.img_c || selectedColor.img_p) : selectedMaterial.img_m}
                        onLoad={() => setIsImgLoading(false)}
                        className={isImgLoading ? styles.skeletonPulse : ''}
                        key={selectedColor?.id || selectedMaterial.id}
                        alt="Preview"
                    />
                    <div className={styles.explainerTextOverlay}>
                      <h1>{selectedMaterial.name_m}</h1>
                    </div>
                </div>
                <div className={styles.explainerRight}>
                    <button className={styles.closeExplainer} onClick={(e) => handleCloseMaterial(e)}>×</button>

                    {!isPrintMaterial ? (
                        Object.keys(groupedColors).map((type) => (
                        <div key={type} className={styles.categoryGroup}>
                            <h4 className={styles.catTitle}>{type}</h4>
                            <div className={styles.swatchGrid}>
                            {groupedColors[type].map((color) => (
                                <div key={color.id} className={`${styles.colorNode} ${selectedColor?.id === color.id ? styles.activeNode : ''}`}
                                     onClick={() => { setIsImgLoading(true); setSelectedColor(color); }}>
                                    <div className={styles.colorSquare}><img src={color.img_c} alt={color.color_name} /></div>
                                    <div className={styles.nodeName}>{color.color_name}</div>
                                </div>
                            ))}
                            </div>
                        </div>
                        ))
                    ) : (
                        <div className={styles.categoryGroup}>
                            <h4 className={styles.catTitle}>Estampados</h4>
                            <div className={styles.swatchGrid}>
                                {availablePrints.map((print) => (
                                <div key={print.id} className={`${styles.colorNode} ${selectedColor?.id === print.id ? styles.activeNode : ''}`}
                                     onClick={() => { setIsImgLoading(true); setSelectedColor({...print, img_c: print.img_p}) }}>
                                    <div className={styles.colorSquare}><img src={print.img_p} alt={print.name_print} /></div>
                                    <div className={styles.nodeName}>{print.name_print}</div>
                                </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN 6: TALLAS (banner estático, no depende de tablas de ingeniería) */}
      <section className={styles.sizeGuideSection}>
        <div className={styles.sizeGuideBanner}>
          <div className={styles.sizeText}>
            <div className={styles.sizeOverline}>Ajuste de Precisión</div>
            <h2>Guía de Tallas</h2>
            <p>Asegura la comodidad impecable de tu   ----</p>
          </div>
          <button className={styles.sizeBtn}>Consultar Guía</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footerCTA}>
        <div className={styles.ctaContent}>
            <h3>Tu configuración está lista</h3>
            <button className={styles.finalBtn}>Solicitar Cotización</button>
        </div>
      </footer>
    </div>
  );
}
